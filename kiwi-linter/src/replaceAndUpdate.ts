/**
 * @author linhuiw
 * @desc 更新文件
 */

import * as vscode from 'vscode';
import { TargetString, TargetTypes } from './search-text/types';
import { getActiveTextEditor, getI18NExp, getKiwiConfig, getRangeByOffset } from './utils';
import { getEndOfLine } from './utils';

/**
 * 更新文件
 * @param {Array} list  目标字符串和对应的key的列表
 */
export async function replaceTargetString(list: { targets: TargetString[]; key: string }[]): Promise<boolean> {
  try {
    const { document } = getActiveTextEditor();
    const curFilename = document.fileName;
    // const isHtmlFile = curFilename.endsWith('.html');
    const isVueFile = curFilename.endsWith('.vue');
    let shouldImportI18N = false;
    const edit = new vscode.WorkspaceEdit();

    list.forEach(({ targets, key }) => {
      const i18nExp = getI18NExp(key);
      targets.forEach(target => {
        const { type, content, start, end, source } = target;
        let range: vscode.Range;
        let newExp = i18nExp;
        if (
          (target.type === TargetTypes.EXPRESSION || target.type === TargetTypes.TEMPLATE_EXPRESSION) &&
          (!isVueFile || target.isInSfcScript)
        ) {
          shouldImportI18N = true;
        }
        if (type === TargetTypes.EXPRESSION) {
          range = getRangeByOffset(source.start, source.end);
        } else if (target.type === TargetTypes.TEMPLATE_EXPRESSION) {
          const keyValuePairs = target.expressions.map((exp, index) => {
            return `val${index}: ${exp.content}`;
          });
          newExp = `I18N.template(${i18nExp}, { ${keyValuePairs.join(', ')} })`;
          range = getRangeByOffset(source.start, source.end);
        } else if (target.type === TargetTypes.VUE_TEXT) {
          newExp = `{{${i18nExp}}}`;
          range = getRangeByOffset(start, end);
        } else if (target.type === TargetTypes.ATTRIBUTE) {
          newExp = `:${source.content.replace(content, i18nExp)}`;
          range = getRangeByOffset(source.start, source.end);
        } else {
          return false;
        }
        edit.replace(document.uri, range, newExp);
      });
    });

    if (shouldImportI18N) {
      insertImportIfNeed(document, edit);
    }
    await vscode.workspace.applyEdit(edit);
    return true;
  } catch (e) {
    vscode.window.showErrorMessage((e as Error).message);
    return false;
  }
}

function insertImportIfNeed(document: vscode.TextDocument, edit: vscode.WorkspaceEdit): void {
  const text = document.getText();
  const kiwiConfig = getKiwiConfig();
  if (!kiwiConfig) {
    return;
  }
  let importStatement = kiwiConfig.importStatement;
  kiwiConfig.projects.forEach(project => {
    if (project.importStatement && document.fileName.includes(project.target)) {
      importStatement = project.importStatement;
    }
  });
  if (!importStatement) {
    console.warn('未找到引入I18N的语句的配置');
    return;
  }
  const p = new RegExp(importStatement);
  if (p.test(text)) {
    return;
  }
  let insertPos: vscode.Position;
  if (document.fileName.endsWith('.vue')) {
    const scriptTagLineNum = text
      .split(document.eol === vscode.EndOfLine.CRLF ? '\r\n' : '\n')
      .findIndex(text => /^<script/.test(text));
    insertPos = document.lineAt(scriptTagLineNum).rangeIncludingLineBreak.end.translate(0, 0);
  } else {
    insertPos = new vscode.Position(0, 0);
  }
  edit.insert(document.uri, insertPos, `${importStatement}${getEndOfLine(document.eol)}`);
}
