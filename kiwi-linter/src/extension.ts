/**
 * @author linhuiw
 * @desc 插件主入口
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
// import * as slash from 'slash2';
import { getSuggestLangObj } from './getLangData';
import { DIR_ADAPTOR } from './const';
import { findI18N, searchI18NInAllFiles } from './findAllI18N';
import {
  createMd5,
  findMatchKey,
  getCurrentProjectLangPathList,
  getLangJson,
  getWorkspacePath,
  pickLangFile
} from './utils';
import { triggerUpdateDecorations } from './chineseCharDecorations';
import { replaceAndUpdate, replaceTargetString } from './replaceAndUpdate';
import { getConfiguration, getConfigFile, getKiwiLinterConfigFile } from './utils';
import { insertKeyValueToFile } from './file';
import { TargetString } from './search-text/types';
import { ExtractI18nArgs, EXTRACT_ALL_I18N, EXTRACT_I18N } from './const/commonds';

/**
 * 主入口文件
 * @param context
 */
export function activate(context: vscode.ExtensionContext): void {
  if (!getKiwiLinterConfigFile() && !getConfigFile() && !fs.existsSync(DIR_ADAPTOR as string)) {
    /** 存在配置文件则开启 */
    return;
  }
  console.log('Congratulations, your extension "better-i18n-linter" is now active!');
  context.subscriptions.push(vscode.commands.registerCommand('better-i18n-linter.findAllI18N', searchI18NInAllFiles));
  let targetStrs: TargetString[] = [];
  let finalLangObj: Record<string, string> = {};

  let activeEditor = vscode.window.activeTextEditor!;
  if (activeEditor) {
    triggerUpdateDecorations((newTargetStrs: TargetString[]) => {
      targetStrs = newTargetStrs;
    });
  }
  //   const currentFilename = activeEditor.document.fileName;
  //   const suggestPageRegex = /\/pages\/\w+\/([^/]+)\/([^/.]+)/;

  const suggestion: RegExpMatchArray = [];
  //   if (currentFilename.includes('/pages/')) {
  //     suggestion = currentFilename.match(suggestPageRegex)!;
  //   }
  //   if (suggestion) {
  //     suggestion.shift();
  //   }
  //   /** 如果没有匹配到 Key */
  //   if (!(suggestion && suggestion.length)) {
  //     const names = slash(currentFilename).split('/') as string[];
  //     const fileName = _.last(names)!;
  //     const fileKey = fileName.split('.')[0].replace(new RegExp('-', 'g'), '_');
  //     const dir = names[names.length - 2].replace(new RegExp('-', 'g'), '_');
  //     if (dir === fileKey) {
  //       suggestion = [dir];
  //     } else {
  //       suggestion = [dir, fileKey];
  //     }
  //   }
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
            finalLangObj = getSuggestLangObj();
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
      // const langData = getLangJson(filePath);
      const langData = getSuggestLangObj();
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

  // 使用 cmd + shift + p 执行的公共文案替换
  context.subscriptions.push(
    vscode.commands.registerCommand('better-i18n-linter.replaceCommon', () => {
      const commandKeys = Object.keys(finalLangObj).filter(k => k.includes('common.'));
      if (targetStrs.length === 0 || commandKeys.length === 0) {
        vscode.window.showInformationMessage('没有找到可替换的公共文案');
        return;
      }

      const replaceableStrs: any[] = targetStrs.reduce<any>((prev, curr) => {
        const key = findMatchKey(finalLangObj, curr.content);
        if (key && key.startsWith('common.')) {
          return prev.concat({
            target: curr,
            key
          });
        }

        return prev;
      }, []);

      if (replaceableStrs.length === 0) {
        vscode.window.showInformationMessage('没有找到可替换的公共文案');
        return;
      }

      vscode.window
        .showInformationMessage(
          `共找到 ${replaceableStrs.length} 处可自动替换的文案，是否替换？`,
          { modal: true },
          'Yes'
        )
        .then(action => {
          if (action === 'Yes') {
            replaceableStrs
              .reverse()
              .reduce((prev: Promise<any>, obj) => {
                return prev.then(() => {
                  return replaceAndUpdate(obj.target, `I18N.${obj.key}`, false);
                });
              }, Promise.resolve())
              .then(() => {
                vscode.window.showInformationMessage('替换完成');
              })
              .catch(e => {
                vscode.window.showErrorMessage(e.message);
              });
          }
        });
    })
  );
  //   const virtualMemory = {};
  // 一键替换所有中文
  //   context.subscriptions.push(
  //     vscode.commands.registerCommand('better-i18n-linter.kiwigo', () => {
  //       if (targetStrs.length === 0) {
  //         vscode.window.showInformationMessage('没有找到可替换的文案');
  //         return;
  //       }

  //       vscode.window
  //         .showInformationMessage(`共找到 ${targetStrs.length} 处可自动替换的文案，是否替换？`, { modal: true }, 'Yes')
  //         .then(action => {
  //           if (action === 'Yes') {
  //             // 翻译中文文案
  //             const translatePromises = targetStrs.reduce((prev, curr) => {
  //               // 避免翻译的字符里包含数字或者特殊字符等情况
  //               const reg = /[^a-zA-Z\x00-\xff]+/g;
  //               const findText = curr.content.match(reg);
  //               const transText = findText!.join('').slice(0, 4);
  //               return prev.concat(translateText(transText) as any);
  //             }, []);

  //             Promise.all(translatePromises).then(([...translateTexts]) => {
  //               const replaceableStrs: any[] = targetStrs.reduce<any>((prev, curr, i) => {
  //                 const key = findMatchKey(finalLangObj, curr.content);
  //                 if (!virtualMemory[curr.content]) {
  //                   if (key) {
  //                     virtualMemory[curr.content] = key;
  //                     return prev.concat({
  //                       target: curr,
  //                       key
  //                     });
  //                   }
  //                   const uuidKey = `${randomstring.generate({
  //                     length: 4,
  //                     charset: 'qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM'
  //                   })}`;
  //                   const transText = translateTexts[i] ? _.camelCase(translateTexts[i]) : uuidKey;
  //                   let transKey = `${suggestion.length ? suggestion.join('.') + '.' : ''}${transText}`;
  //                   let occurTime = 1;
  //                   // 防止出现前四位相同但是整体文案不同的情况
  //                   while (
  //                     finalLangObj[transKey] !== curr.content &&
  //                     _.keys(finalLangObj).includes(`${transKey}${occurTime >= 2 ? occurTime : ''}`)
  //                   ) {
  //                     occurTime++;
  //                   }
  //                   if (occurTime >= 2) {
  //                     transKey = `${transKey}${occurTime}`;
  //                   }
  //                   virtualMemory[curr.content] = transKey;
  //                   finalLangObj[transKey] = curr.content;
  //                   return prev.concat({
  //                     target: curr,
  //                     key: transKey
  //                   });
  //                 } else {
  //                   return prev.concat({
  //                     target: curr,
  //                     key: virtualMemory[curr.content]
  //                   });
  //                 }
  //               }, []);

  //               replaceableStrs
  //                 .reverse()
  //                 .reduce((prev: Promise<any>, obj) => {
  //                   return prev.then(() => {
  //                     return replaceAndUpdate(obj.target, `I18N.${obj.key}`, false);
  //                   });
  //                 }, Promise.resolve())
  //                 .then(() => {
  //                   vscode.window.showInformationMessage('替换完成');
  //                 })
  //                 .catch(e => {
  //                   vscode.window.showErrorMessage(e.message);
  //                 });
  //             });
  //           }
  //         });
  //     })
  //   );

  // 当 切换文档 的时候重新检测当前文档中的中文文案
  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor(editor => {
      activeEditor = editor!;
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
      if (activeEditor && event.document === activeEditor.document) {
        triggerUpdateDecorations(newTargetStrs => {
          targetStrs = newTargetStrs;
        });
      }
    }, null)
  );
}
