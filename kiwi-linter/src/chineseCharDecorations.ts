/**
 * @author linhuiw
 * @desc 查找代码中的中文, 并标记
 */
import * as vscode from 'vscode';
import { setLineDecorations } from './lineAnnotation';
import * as minimatch from 'minimatch';
import { getConfiguration } from './utils';
import { searchChinese } from './search-text';
import { TargetString } from './search-text/types';

/**
 * 中文的标记，红框样式
 */
function getChineseCharDecoration() {
  // 配置提示框样式
  const hasOverviewRuler = getConfiguration('showOverviewRuler');
  const shouldMark = getConfiguration('markStringLiterals');
  const color = getConfiguration('markColor') as string;
  return vscode.window.createTextEditorDecorationType({
    borderWidth: shouldMark ? '1px' : undefined,
    borderStyle: shouldMark ? 'dotted' : undefined,
    overviewRulerColor: hasOverviewRuler ? color : undefined,
    overviewRulerLane: hasOverviewRuler ? vscode.OverviewRulerLane.Right : undefined,
    light: {
      borderColor: shouldMark ? color : undefined
    },
    dark: {
      borderColor: shouldMark ? color : undefined
    }
  });
}

let timeout;
let prevChineseCharDecoration: vscode.TextEditorDecorationType;
export function triggerUpdateDecorations(callback?) {
  if (timeout) {
    clearTimeout(timeout);
  }
  timeout = setTimeout(() => {
    const activeEditor = vscode.window.activeTextEditor!;
    if (prevChineseCharDecoration) {
      /** 清除原有的提示 */
      activeEditor.setDecorations(prevChineseCharDecoration, []);
    }
    if (!matchPattern()) {
      return;
    }
    try {
      const { targetStrs, chineseCharDecoration } = updateDecorations()!;
      prevChineseCharDecoration = chineseCharDecoration;
      callback(targetStrs);
    } catch (e) {
      vscode.window.showErrorMessage(e);
    }
  }, 500);
}

/**
 * 查看文件名是否匹配
 */
function matchPattern() {
  const activeEditor = vscode.window.activeTextEditor!;
  const pattern = getConfiguration('i18nFilesPattern');
  if (
    activeEditor &&
    pattern !== '' &&
    !minimatch(
      activeEditor.document.uri.fsPath.replace(vscode.workspace.workspaceFolders![0].uri.fsPath + '/', ''),
      pattern
    )
  ) {
    return false;
  } else {
    return true;
  }
}
/**
 * 更新标记
 */
export function updateDecorations() {
  const activeEditor = vscode.window.activeTextEditor!;
  const currentFilename = activeEditor.document.fileName;
  const chineseCharDecoration = getChineseCharDecoration();
  if (!activeEditor) {
    return;
  }

  const text = activeEditor.document.getText();
  // 清空上一次的保存结果
  let targetStrs: TargetString[] = [];
  const chineseChars: vscode.DecorationOptions[] = [];

  targetStrs = searchChinese(text, currentFilename);
  console.log('targetStrs: ', targetStrs);
  targetStrs.map(match => {
    const decoration = {
      range: new vscode.Range(
        activeEditor.document.positionAt(match.start),
        activeEditor.document.positionAt(match.end)
      ),
      hoverMessage: `🐤 检测到中文文案🇨🇳 ： ${match.content}`
    };
    chineseChars.push(decoration);
  });

  const shouldMark = getConfiguration('markStringLiterals');
  if (!!shouldMark !== true) {
    return;
  }

  /** 设置 I18N 的提示 */
  setLineDecorations(activeEditor);
  /** 设置中文的提示 */
  activeEditor.setDecorations(chineseCharDecoration, chineseChars);

  return {
    targetStrs,
    chineseCharDecoration
  };
}
