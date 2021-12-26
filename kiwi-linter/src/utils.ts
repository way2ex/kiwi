/**
 * @author linhuiw
 * @desc 工具方法
 */
import * as _ from 'lodash';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as crypto from 'crypto';
import * as globby from 'globby';
import * as GoogleTranslate from 'google-translate';
import { workspaceManager } from './workspace';
interface NestedObj {
  [key: string]: NestedObj | string | string[];
}
/**
 * 将对象拍平
 * @param obj    原始对象
 * @param prefix
 */
export function flatten(obj: NestedObj, prefix?: string): Record<string, string> {
  const propName = prefix ? prefix + '.' : '',
    ret = {};

  for (const attr in obj) {
    if (Array.isArray(obj[attr])) {
      ret[attr] = (obj[attr] as string[]).join(',');
    } else if (typeof obj[attr] === 'object') {
      _.extend(ret, flatten(obj[attr] as NestedObj, propName + attr));
    } else {
      ret[propName + attr] = obj[attr];
    }
  }
  return ret;
}

/**
 * 获取文件 Json
 */
export function getLangJson(fileName: string): Record<string, string> {
  if (!fs.existsSync(fileName)) {
    return {};
  }
  const fileContent = fs.readFileSync(fileName, { encoding: 'utf8' });
  const matchRes = fileContent.match(/export\s*default\s*({[\s\S]+);?$/);
  if (!matchRes || !matchRes[1]) {
    return {};
  }
  let obj = matchRes[1];
  obj = obj.replace(/\s*;\s*$/, '').replace(/\.\.\.\w+,?/, '');
  let jsObj = {};
  try {
    jsObj = eval('(' + obj + ')');
  } catch (err) {
    console.log(obj);
    console.error(err);
  }
  return jsObj;
}

/**
 * 获取配置，支持从vscode和配置文件(优先)中取到配置项
 */
export const getConfiguration = (text: string): string => {
  let value = vscode.workspace.getConfiguration('better-i18n-linter').get(text) as string;
  const kiwiConfigJson = getConfigFile();
  if (!kiwiConfigJson) {
    return value;
  }
  const config = getLangJson(kiwiConfigJson);
  if (text in config) {
    value = config[text];
  }
  return value;
};

/**
 * 查找kiwi-cli配置文件
 */
export const getConfigFile = (): string | null => {
  let kiwiConfigJson = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/.kiwirc.js`;
  // 先找js
  if (!fs.existsSync(kiwiConfigJson)) {
    kiwiConfigJson = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/.kiwirc.ts`;
    //再找ts
    if (!fs.existsSync(kiwiConfigJson)) {
      return null;
    }
  }
  return kiwiConfigJson;
};

/**
 * 查找kiwi-linter配置文件
 */
export const getKiwiLinterConfigFile = (): null | string => {
  const kiwiConfigJson = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/.kiwi`;
  // 先找js
  if (!fs.existsSync(kiwiConfigJson)) {
    return null;
  }
  return kiwiConfigJson;
};

/**
 * 获得项目配置信息中的 googleApiKey
 */
function getGoogleApiKey() {
  const configFile = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/.kiwi`;
  let googleApiKey = '';

  try {
    if (fs.existsSync(configFile)) {
      googleApiKey = JSON.parse(fs.readFileSync(configFile, 'utf8')).googleApiKey;
    }
  } catch (error) {
    console.log(error);
  }
  return googleApiKey;
}

/**
 * 重试方法
 * @param asyncOperation
 * @param times
 */
function retry(asyncOperation, times = 1) {
  let runTimes = 1;
  const handleReject = e => {
    if (runTimes++ < times) {
      return asyncOperation().catch(handleReject);
    } else {
      throw e;
    }
  };
  return asyncOperation().catch(handleReject);
}

/**
 * 设置超时
 * @param promise
 * @param ms
 */
function withTimeout(promise, ms) {
  const timeoutPromise = new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(`Promise timed out after ${ms} ms.`);
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]);
}

/**
 * 翻译中文
 */
export function translateText(text: string): string {
  const googleApiKey = getGoogleApiKey();
  const { translate: googleTranslate } = GoogleTranslate(googleApiKey);

  function _translateText() {
    return withTimeout(
      new Promise((resolve, reject) => {
        googleTranslate(text, 'zh', 'en', (err, translation) => {
          if (err) {
            reject(err);
          } else {
            resolve(translation.translatedText);
          }
        });
      }),
      3000
    );
  }

  return retry(_translateText, 3);
}

/**
 * 获取多项目配置
 */
export function getTargetLangPath(currentFilePath: string): string | string[] {
  const configFile = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/.kiwi`;
  let targetLangPath = 'src/lang/zh-CN/';

  try {
    if (fs.existsSync(configFile)) {
      const { projects = [] } = JSON.parse(fs.readFileSync(configFile, 'utf8'));
      // console.log(projects);
      for (const config of projects) {
        if (currentFilePath.indexOf(`/${config.target}/`) > -1) {
          if (Array.isArray(config.kiwiDir)) {
            targetLangPath = config.kiwiDir.map(
              dir => `${vscode.workspace.workspaceFolders![0].uri.fsPath}/${dir}/zh-CN/`
            );
          } else {
            targetLangPath = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/${config.kiwiDir}/zh-CN/`;
          }
          return targetLangPath;
        }
      }
    }
  } catch (error) {
    console.log(error);
  }

  return targetLangPath;
}

/**
 * 获取当前文件对应的项目路径的 glob
 */
export function getCurrentProjectLangPath(): string {
  if (!vscode.window.activeTextEditor) {
    return '';
  }
  const targetLangPath = getTargetLangPath(vscode.window.activeTextEditor!.document.uri.path);
  if (Array.isArray(targetLangPath)) {
    if (targetLangPath.length === 0) {
      return '';
    }
    if (targetLangPath.length === 1) {
      return `${targetLangPath[0]}**/*.{ts,js}`;
    }
    return `{${targetLangPath.join(',')}}**/*.{ts,js}`;
  }
  if (targetLangPath) {
    return `${targetLangPath}**/*.{ts,js}`;
  }
  return '';
}

export function getCurrentProjectLangPathList(): string[] {
  const globExp = getCurrentProjectLangPath();
  const paths = globby.sync(globExp, {
    cwd: vscode.workspace.workspaceFolders![0].uri.fsPath,
    absolute: true
  });
  return paths;
}

/**
 * 获取当前文件对应的语言路径
 */
export function getLangPrefix(): string {
  const langPrefix = getTargetLangPath(vscode.window.activeTextEditor!.document.uri.path);
  return Array.isArray(langPrefix) ? langPrefix.pop() || '' : langPrefix;
}

export function createMd5(message: string): string {
  const hash = crypto
    .createHash('md5')
    .update(message.trim())
    .digest('hex')
    .substr(8, 16);
  return hash;
}

export function getActiveTextEditor(): vscode.TextEditor {
  return vscode.window.activeTextEditor!;
}

export function getWorkspacePath(): string {
  return vscode.workspace.workspaceFolders![0].uri.fsPath;
}

export function getI18NExp(key: string): string {
  if (/^[0-9]/.test(key)) {
    return `I18N['${key}']`;
  }
  return `I18N.${key}`;
}

export function getRangeByOffset(start: number, end: number): vscode.Range {
  const { document } = getActiveTextEditor();
  return new vscode.Range(document.positionAt(start), document.positionAt(end));
}

interface IProjectConfig {
  target: string;
  kiwiDir: string[];
  importStatement?: string;
}
export interface IKiwiConfig {
  projects: IProjectConfig[];
  importStatement?: string;
}
/**
 * 获取 .kiwi 配置文件中的配置
 * @param key 要获取的key
 * @returns 对应的配置
 */
export function getKiwiConfig(key?: string | undefined): IKiwiConfig | undefined {
  const file = getKiwiLinterConfigFile();
  if (!file) {
    return undefined;
  }
  try {
    const config = JSON.parse(fs.readFileSync(file, 'utf8'));
    if (key) {
      return _.get(config, key);
    } else {
      return config;
    }
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

export function getEndOfLine(eol: vscode.EndOfLine): string {
  return eol === vscode.EndOfLine.LF ? '\n' : '\r\n';
}

export async function pickLangFile(): Promise<string | undefined> {
  const curSpace = workspaceManager.getCurrentWorkspace();
  const langPaths = curSpace.getLangPaths().map(dir => dir.replace(curSpace.uri.fsPath, ''));
  const fileName = await vscode.window.showQuickPick(langPaths);
  if (!fileName) {
    return;
  }
  return `${curSpace.uri.fsPath}${fileName}`;
}
