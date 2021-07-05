/**
 * @author linhuiw
 * @desc 文件相关操作
 */
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as _ from 'lodash';
import * as prettier from 'prettier';
import { getLangData } from './getLangData';
import { getActiveTextEditor, getLangPrefix } from './utils';
import { LANG_PREFIX } from './const';
import { TargetString, TargetTypes } from './search-text/types';
import { formatTemplateString } from './pure-utils';

export function updateLangFiles(keyValue: string, text: string, validateDuplicate: boolean) {
  if (!keyValue.startsWith('I18N.')) {
    return;
  }
  const [, filename, ...restPath] = keyValue.split('.');
  const fullKey = restPath.join('.');
  const targetFilename = `${getLangPrefix() || LANG_PREFIX}${filename}.ts`;

  if (!fs.existsSync(targetFilename)) {
    fs.outputFileSync(targetFilename, generateNewLangFile(fullKey, text));
    addImportToMainLangFile(filename);
    vscode.window.showInformationMessage(`成功新建语言文件 ${targetFilename}`);
  } else {
    // 清除 require 缓存，解决手动更新语言文件后再自动抽取，导致之前更新失效的问题
    const mainContent = getLangData(targetFilename);
    const obj = mainContent;

    if (Object.keys(obj).length === 0) {
      vscode.window.showWarningMessage(`${filename} 解析失败，该文件包含的文案无法自动补全`);
    }

    if (validateDuplicate && _.get(obj, fullKey) !== undefined) {
      vscode.window.showErrorMessage(`${targetFilename} 中已存在 key 为 \`${fullKey}\` 的翻译，请重新命名变量`);
      throw new Error('duplicate');
    }
    // \n 会被自动转义成 \\n，这里转回来
    text = text.replace(/\\n/gm, '\n');
    _.set(obj, fullKey, text);
    fs.writeFileSync(targetFilename, prettierFile(`export default ${JSON.stringify(obj, null, 2)}`));
  }
}
/**
 * 使用 Prettier 格式化文件
 * @param fileContent
 */
function prettierFile(fileContent: string) {
  try {
    return prettier.format(fileContent, {
      parser: 'typescript',
      trailingComma: 'all',
      singleQuote: true
    });
  } catch (e) {
    console.error(`代码格式化报错！${e.toString()}\n代码为：${fileContent}`);
    return fileContent;
  }
}

export function generateNewLangFile(key: string, value: string) {
  const obj = _.set({}, key, value);

  return prettierFile(`export default ${JSON.stringify(obj, null, 2)}`);
}

export function addImportToMainLangFile(newFilename: string) {
  let mainContent = '';
  const langPrefix = getLangPrefix() || LANG_PREFIX;
  if (fs.existsSync(`${langPrefix}index.ts`)) {
    mainContent = fs.readFileSync(`${langPrefix}index.ts`, 'utf8');
    mainContent = mainContent.replace(/^(\s*import.*?;)$/m, `$1\nimport ${newFilename} from './${newFilename}';`);

    if (/\n(}\);)/.test(mainContent)) {
      if (/,\n(}\);)/.test(mainContent)) {
        /** 最后一行包含,号 */
        mainContent = mainContent.replace(/(}\);)/, `  ${newFilename},\n$1`);
      } else {
        /** 最后一行不包含,号 */
        mainContent = mainContent.replace(/\n(}\);)/, `,\n  ${newFilename},\n$1`);
      }
    }

    if (/\n(};)/.test(mainContent)) {
      if (/,\n(};)/.test(mainContent)) {
        /** 最后一行包含,号 */
        mainContent = mainContent.replace(/(};)/, `  ${newFilename},\n$1`);
      } else {
        /** 最后一行不包含,号 */
        mainContent = mainContent.replace(/\n(};)/, `,\n  ${newFilename},\n$1`);
      }
    }
  } else {
    mainContent = `import ${newFilename} from './${newFilename}';\n\nexport default Object.assign({}, {\n  ${newFilename},\n});`;
  }

  fs.outputFileSync(`${langPrefix}index.ts`, mainContent);
}

/**
 * 向文件中插入一个键值对，目前只考虑简单的情况，且只支持插入一级
 * @param key 插入的键
 * @param value 插入的值
 * @param fileUri 文件地址
 */
export async function insertKeyValueToFile(
  key: string,
  target: TargetString,
  targetFileName: string
): Promise<boolean> {
  const fileContent = fs.readFileSync(targetFileName, { encoding: 'utf8' });
  const lines = fileContent.split('\n');
  const realKey = /^[0-9]/.test(key) ? `'${key}'` : key;
  let value = target.content;
  if (target.type === TargetTypes.TEMPLATE_EXPRESSION && target.expressions.length) {
    // todo: 这里只适用于简单情况
    value = formatTemplateString(value);
  }
  const newLine = `    ${realKey}: '${value}',\n`;
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
  edit.insert(vscode.Uri.file(targetFileName), position, newLine);
  vscode.workspace.applyEdit(edit);
  const document = await vscode.workspace.openTextDocument(targetFileName);
  return document.save();
}
