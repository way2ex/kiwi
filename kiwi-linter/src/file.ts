/**
 * @author linhuiw
 * @desc 文件相关操作
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { TargetString, TargetTypes } from './search-text/types';
import { formatTemplateString } from './pure-utils';

/**
 * 向文件中插入多个键值对，目前只考虑简单的情况，且只支持插入一级
 * @param list 要插入的键值对
 * @param fileUri 文件地址
 */
export async function insertKeyValueToFile(
  list: { key: string; target: TargetString }[],
  targetFileName: string
): Promise<boolean> {
  try {
    const fileContent = fs.readFileSync(targetFileName, { encoding: 'utf8' });
    const lines = fileContent.split('\n');
    const newLines = list.map(({ key, target }) => {
      const realKey = /^[0-9]/.test(key) ? `'${key}'` : key;
      let value = target.content;
      if (target.type === TargetTypes.TEMPLATE_EXPRESSION && target.expressions.length) {
        // todo: 这里只适用于简单情况
        value = formatTemplateString(value);
      }
      const newLine = `    ${realKey}: '${value}',\n`;
      return newLine;
    });
    const pattern = /export\s*default\s*\{/;

    const exportDefaultLine = lines.findIndex(line => {
      return pattern.test(line);
    });
    if (exportDefaultLine === -1) {
      // Todo: 兼容更多格式的解析, 考虑操作 ast
      vscode.window.showErrorMessage(`插入新的键值对失败，未能成功解析文件${targetFileName}`);
      return false;
    }
    const position = new vscode.Position(exportDefaultLine + 1, 0);
    const edit = new vscode.WorkspaceEdit();
    edit.insert(vscode.Uri.file(targetFileName), position, newLines.join(''));
    vscode.workspace.applyEdit(edit);
    const document = await vscode.workspace.openTextDocument(targetFileName);
    const res = await document.save();
    return res;
  } catch (e) {
    vscode.window.showErrorMessage((e as Error).message);
    return false;
  }
}
