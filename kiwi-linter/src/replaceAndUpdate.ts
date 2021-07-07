/**
 * @author linhuiw
 * @desc 更新文件
 */

import { TargetStr } from './define';
import * as vscode from 'vscode';
import { updateLangFiles } from './file';
import { TargetString, TargetTypes } from './search-text/types';
import { getActiveTextEditor, getI18NExp, getKiwiConfig, getRangeByOffset } from './utils';
import { getEndOfLine } from './utils';
/**
 * 更新文件
 * @param arg  目标字符串对象
 * @param val  目标 key
 * @param validateDuplicate 是否校验文件中已经存在要写入的 key
 */
export function replaceAndUpdate(arg: TargetStr, val: string, validateDuplicate: boolean): Thenable<any> {
  const activeEditor = vscode.window.activeTextEditor!;
  const currentFilename = activeEditor.document.fileName;
  const isHtmlFile = currentFilename.endsWith('.html');
  const isVueFile = currentFilename.endsWith('.vue');
  const edit = new vscode.WorkspaceEdit();
  const { document } = vscode.window.activeTextEditor!;
  let finalReplaceText = arg.text;
  // 若是字符串，删掉两侧的引号
  if (arg.isString) {
    // 如果引号左侧是 等号，则可能是 jsx 的 props，此时要替换成 {
    let startColPostion;
    try {
      startColPostion = arg.range.start.translate(0, -2);
    } catch (e) {
      startColPostion = arg.range.start.translate(0, 0);
    }
    const prevTextRange = new vscode.Range(startColPostion, arg.range.start);
    const [last2Char, last1Char] = document.getText(prevTextRange).split('');
    let finalReplaceVal = val;
    if (last2Char === '=') {
      if (isHtmlFile) {
        finalReplaceVal = '{{' + val + '}}';
      } else if (isVueFile) {
        finalReplaceVal = '{{' + val + '}}';
        const { isAttr = false, attrInfo } = arg as any;
        if (isAttr) {
          const { start, end, name, value } = attrInfo;
          const attrStrRange = new vscode.Range(document.positionAt(start), document.positionAt(end));
          const attrStr = document.getText(attrStrRange);
          const newAttrString = attrStr.replace(name, `:${name}`).replace(value, `${val}`);
          edit.replace(document.uri, attrStrRange, newAttrString);
          return vscode.workspace.applyEdit(edit);
        }
      } else {
        finalReplaceVal = '{' + val + '}';
      }
    }
    // 若是模板字符串，看看其中是否包含变量
    if (last1Char === '`') {
      const varInStr = arg.text.match(/(\$\{[^}]+?\})/g);
      if (varInStr) {
        const kvPair = varInStr.map((str, index) => {
          return `val${index + 1}: ${str.replace(/^\${([^}]+)\}$/, '$1')}`;
        });
        finalReplaceVal = `I18N.template(${val}, { ${kvPair.join(',\n')} })`;

        varInStr.forEach((str, index) => {
          finalReplaceText = finalReplaceText.replace(str, `{val${index + 1}}`);
        });
      }
    }

    edit.replace(
      document.uri,
      arg.range.with({
        start: arg.range.start.translate(0, -1),
        end: arg.range.end.translate(0, 1)
      }),
      finalReplaceVal
    );
  } else {
    if (isHtmlFile) {
      edit.replace(document.uri, arg.range, '{{' + val + '}}');
    } else if (isVueFile) {
      edit.replace(document.uri, arg.range, '{{' + val + '}}');
    } else {
      edit.replace(document.uri, arg.range, '{' + val + '}');
    }
  }

  try {
    // 更新语言文件
    updateLangFiles(val, finalReplaceText, validateDuplicate);
    // 若更新成功再替换代码
    return vscode.workspace.applyEdit(edit);
  } catch (e) {
    return Promise.reject(e.message);
  }
}

/**
 * 更新文件
 * @param arg  目标字符串对象
 * @param val  目标 key
 * @param validateDuplicate 是否校验文件中已经存在要写入的 key
 */
export async function replaceTargetString(targets: TargetString[], key: string): Promise<boolean> {
  const { document } = getActiveTextEditor();
  const curFilename = document.fileName;
  // const isHtmlFile = curFilename.endsWith('.html');
  const isVueFile = curFilename.endsWith('.vue');
  const i18nExp = getI18NExp(key);
  const edit = new vscode.WorkspaceEdit();
  let shuldImportI18N = false;
  targets.forEach(target => {
    const { type, content, start, end, source } = target;
    let range: vscode.Range;
    let newExp = i18nExp;
    if (
      (target.type === TargetTypes.EXPRESSION || target.type === TargetTypes.TEMPLATE_EXPRESSION) &&
      (!isVueFile || target.isInSfcScript)
    ) {
      shuldImportI18N = true;
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
  if (shuldImportI18N) {
    insertImportIfNeed(document, edit);
  }
  await vscode.workspace.applyEdit(edit);
  return true;
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
