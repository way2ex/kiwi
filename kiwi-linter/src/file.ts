/**
 * @author linhuiw
 * @desc 文件相关操作
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import { TargetString, TargetTypes } from './search-text/types';
import { addPropertiesToObject, formatTemplateString } from './pure-utils';

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
    const document = await vscode.workspace.openTextDocument(targetFileName);
    const fileContent = document.getText();
    const kvList = list.map(({ key, target }) => {
      const realKey = /^[0-9]/.test(key) ? `'${key}'` : key;
      let value = target.content;
      if (target.type === TargetTypes.TEMPLATE_EXPRESSION && target.expressions.length) {
        // todo: 这里只适用于简单情况
        value = formatTemplateString(value);
      }
      return { key: realKey, value };
    });
    let newCode = fileContent;
    try {
      newCode = addPropertiesToObject(fileContent, kvList);
    } catch (e) {
      const message = (e as Error).message;
      vscode.window.showErrorMessage(`插入新的键值对失败，未能成功解析文件${message}`);
      return false;
    }
    const range = new vscode.Range(new vscode.Position(0, 0), document.lineAt(document.lineCount - 1).range.end);
    const edit = new vscode.WorkspaceEdit();
    edit.replace(document.uri, range, newCode);
    vscode.workspace.applyEdit(edit);
    const saveResult = document.save();
    return saveResult;
  } catch (e) {
    vscode.window.showErrorMessage((e as Error).message);
    return false;
  }
}
