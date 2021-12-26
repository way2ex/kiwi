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
import { workspaceManager } from './workspace';

/**
 * 中文的标记，红框样式
 */
function getChineseCharDecoration() {
  // 配置提示框样式
  const curSpace = workspaceManager.getCurrentWorkspace();

  const { showOverviewRuler, markStringLiterals, markColor } = curSpace?.config || {};
  return vscode.window.createTextEditorDecorationType({
    borderWidth: markStringLiterals ? '1px' : undefined,
    borderStyle: markStringLiterals ? 'dotted' : undefined,
    overviewRulerColor: showOverviewRuler ? markColor : undefined,
    overviewRulerLane: showOverviewRuler ? vscode.OverviewRulerLane.Right : undefined,
    light: {
      borderColor: markStringLiterals ? markColor : undefined
    },
    dark: {
      borderColor: markStringLiterals ? markColor : undefined
    }
  });
}

let timeout;
let prevChineseCharDecoration: vscode.TextEditorDecorationType;
export function triggerUpdateDecorations(callback?: (targetStrs: TargetString[]) => void): void {
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
      callback && callback(targetStrs);
    } catch (e) {
      //   vscode.window.showErrorMessage((e as Error).message);
    }
  }, 500);
}

/**
 * 查看文件名是否匹配
 */
function matchPattern() {
  const activeEditor = vscode.window.activeTextEditor;
  const workspace = workspaceManager.getCurrentWorkspace()!;
  const pattern = workspace.config.i18nFilesPattern;
  if (
    !activeEditor ||
    !pattern ||
    !minimatch(activeEditor.document.uri.fsPath.replace(workspace.uri.fsPath + '/', ''), pattern)
  ) {
    return false;
  } else {
    return true;
  }
}
/**
 * 更新标记
 */
export function updateDecorations():
  | {
      targetStrs: TargetString[];
      chineseCharDecoration: vscode.TextEditorDecorationType;
    }
  | undefined {
  const activeEditor = vscode.window.activeTextEditor!;
  if (!activeEditor) {
    return;
  }
  const currentFilename = activeEditor.document.fileName;
  const chineseCharDecoration = getChineseCharDecoration();

  const text = activeEditor.document.getText();
  // 清空上一次的保存结果
  let targetStrs: TargetString[] = [];
  const chineseChars: vscode.DecorationOptions[] = [];

  targetStrs = searchChinese(text, currentFilename);
  targetStrs.forEach(match => {
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
  setLineDecorations();
  /** 设置中文的提示 */
  activeEditor.setDecorations(chineseCharDecoration, chineseChars);

  return {
    targetStrs,
    chineseCharDecoration
  };
}
