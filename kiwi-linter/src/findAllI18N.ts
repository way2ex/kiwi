/**
 * @author linhuiw
 * @desc 查找所有 I18N 值
 */
import * as vscode from 'vscode';
import { findI18NPositions } from './findI18NPositions';
import { transformPosition } from './lineAnnotation';
import { workspaceManager } from './workspace';

/**
 * 查找 I18N
 */
export function findI18N(): void {
  const document = vscode.window.activeTextEditor!.document;
  const code = document.getText();
  const positions = findI18NPositions(code);

  vscode.window.showQuickPick(positions.map(pos => `${pos.cn}  ${pos.code}`)).then(item => {
    const foundPos = positions.find(pos => `${pos.cn}  ${pos.code}` === item)!;

    const range = transformPosition(foundPos, code);
    vscode.window.activeTextEditor!.selection = new vscode.Selection(range.start, range.end);
    vscode.window.activeTextEditor!.revealRange(range, vscode.TextEditorRevealType.InCenter);
  });
}

/**
 * 全局查找用到的文案
 */
export async function searchI18NInAllFiles(): Promise<void> {
  const allItems = Object.entries(workspaceManager.getAllLangData()).map(([k, v]) => `${v}: ${k}`);
  const item = await vscode.window.showQuickPick(allItems).then(
    res => res,
    () => undefined
  );
  if (!item) {
    return;
  }
  const key = item.split(': ')[1];
  vscode.commands.executeCommand('workbench.action.findInFiles', {
    query: key
  });
}
