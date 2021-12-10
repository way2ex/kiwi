/**
 * @author linhuiw
 * @desc 插件主入口
 */
import * as vscode from 'vscode';

import { findI18N, searchI18NInAllFiles } from './findAllI18N';
import { createMd5, pickLangFile } from './utils';
import { triggerUpdateDecorations } from './chineseCharDecorations';
import { replaceTargetString } from './replaceAndUpdate';
import { getConfiguration } from './utils';
import { insertKeyValueToFile } from './file';
import { TargetString } from './search-text/types';
import { ExtractI18nArgs, EXTRACT_ALL_I18N, EXTRACT_I18N } from './const/commonds';
import { workspaceManager } from './workspace';
import { getChannel } from './channelLog';

/**
 * 主入口文件
 * @param context
 */
export function activate(context: vscode.ExtensionContext): void {
  if (workspaceManager.length === 0) {
    return;
  }
  const _channel = getChannel();
  _channel.appendLine('Congratulations, your extension "better-i18n-linter" is now active!');
  context.subscriptions.push(_channel);
  context.subscriptions.push(vscode.commands.registerCommand('better-i18n-linter.findAllI18N', searchI18NInAllFiles));
  let targetStrs: TargetString[] = [];
  let finalLangObj: Record<string, string> = {};

  if (vscode.window.activeTextEditor) {
    triggerUpdateDecorations((newTargetStrs: TargetString[]) => {
      targetStrs = newTargetStrs;
    });
  }

  context.subscriptions.push(vscode.commands.registerTextEditorCommand('better-i18n-linter.findI18N', findI18N));

  // 识别到出错时点击小灯泡弹出的操作
  const hasLightBulb = getConfiguration('enableReplaceSuggestion');
  if (hasLightBulb) {
    context.subscriptions.push(
      vscode.languages.registerCodeActionsProvider(
        [
          { scheme: 'file', language: 'typescriptreact' },
          { scheme: 'file', language: 'html' },
          { scheme: 'file', language: 'typescript' },
          { scheme: 'file', language: 'javascriptreact' },
          { scheme: 'file', language: 'javascript' },
          { scheme: '*', language: 'vue' }
        ],
        {
          provideCodeActions(document, range) {
            const targetStr = targetStrs.find(
              t =>
                range.intersection(new vscode.Range(document.positionAt(t.start), document.positionAt(t.end))) !==
                undefined
            );
            if (!targetStr) {
              return [];
            }
            const sameTextStrs = targetStrs.filter(t => t.content === targetStr.content);
            const text = targetStr.content;
            const actions: vscode.CodeAction[] = [];
            finalLangObj = workspaceManager.getCurrentWorkspace()!.getTargetLangData();
            for (const key of Object.keys(finalLangObj)) {
              if (finalLangObj[key] === text) {
                actions.push({
                  title: `抽取为 \`I18N['${key}']\``,
                  command: {
                    ...EXTRACT_I18N,
                    arguments: [
                      {
                        targets: sameTextStrs,
                        key,
                        value: text
                      }
                    ]
                  }
                });
              }
            }
            if (!actions.length) {
              actions.push({
                title: '抽取并自动生成key',
                command: {
                  ...EXTRACT_I18N,
                  arguments: [
                    {
                      targets: sameTextStrs,
                      value: text,
                      autoGenerateKey: true
                    }
                  ]
                }
              });
            }
            return actions;
          }
        }
      )
    );
  }

  // 点击小灯泡后进行替换操作
  context.subscriptions.push(
    vscode.commands.registerCommand(EXTRACT_I18N.command, async (args: ExtractI18nArgs) => {
      const { key, value, targets, autoGenerateKey } = args;
      if (key) {
        await replaceTargetString([{ targets, key }]);
        vscode.window.showInformationMessage(`成功替换${targets.length}处文案`);
        return;
      }
      if (autoGenerateKey) {
        const hashKey = createMd5(value);
        const filePath = await pickLangFile();
        if (!filePath) {
          return;
        }

        const res = await insertKeyValueToFile([{ key: hashKey, target: targets[0]! }], filePath);
        if (!res) {
          return;
        }
        await replaceTargetString([{ targets, key: hashKey }]);
        vscode.window.showInformationMessage(`成功增加 key 并替换${targets.length}处文案`);
        return;
      }
      // todo: 自定义输入key
    })
  );

  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(EXTRACT_ALL_I18N.command, async (editor, edit, args) => {
      const filePath = await pickLangFile();
      if (!filePath) {
        return;
      }
      const langData = workspaceManager.getCurrentWorkspace().getTargetLangData();
      const valueKeyMap = Object.entries(langData).reduce((acc, [key, val]) => {
        acc[val] = key;
        return acc;
      }, {});
      const kvListToInsert: { key: string; target: TargetString }[] = [];
      targetStrs.forEach(target => {
        if (valueKeyMap[target.content]) {
          return;
        }
        const key = createMd5(target.content);
        kvListToInsert.push({
          target,
          key
        });
        valueKeyMap[target.content] = key;
      });
      const res = await insertKeyValueToFile(kvListToInsert, filePath);
      if (!res) {
        return;
      }

      const targetsToReplace: Record<string, { targets: TargetString[]; key: string }> = {};
      targetStrs.forEach(target => {
        const key = valueKeyMap[target.content];
        if (!targetsToReplace[target.content]) {
          targetsToReplace[target.content] = {
            targets: [target],
            key
          };
        } else {
          targetsToReplace[target.content].targets.push(target);
        }
      });
      await replaceTargetString(Object.values(targetsToReplace));
      vscode.window.showInformationMessage(`成功增加 key 并替换${targetStrs.length}处文案`);
      return;
    })
  );

  // 当 切换文档 的时候重新检测当前文档中的中文文案
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      if (editor) {
        triggerUpdateDecorations(newTargetStrs => {
          targetStrs = newTargetStrs;
        });
      }
    }, null)
  );

  // 当 文档发生变化时 的时候重新检测当前文档中的中文文案
  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument(event => {
      if (vscode.window.activeTextEditor?.document === event.document) {
        triggerUpdateDecorations(newTargetStrs => {
          targetStrs = newTargetStrs;
        });
      }
    }, null)
  );
}
