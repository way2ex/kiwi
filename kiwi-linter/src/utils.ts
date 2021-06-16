/**
 * @author linhuiw
 * @desc 工具方法
 */
import * as _ from 'lodash';
import * as vscode from 'vscode';
import * as fs from 'fs-extra';
import * as path from 'path';

/**
 * 将对象拍平
 * @param obj    原始对象
 * @param prefix
 */
export function flatten(obj, prefix?) {
  var propName = prefix ? prefix + '.' : '',
    ret = {};

  for (var attr in obj) {
    if (_.isArray(obj[attr])) {
      var len = obj[attr].length;
      ret[attr] = obj[attr].join(',');
    } else if (typeof obj[attr] === 'object') {
      _.extend(ret, flatten(obj[attr], propName + attr));
    } else {
      ret[propName + attr] = obj[attr];
    }
  }
  return ret;
}

/**
 * 查找当前位置的 Code
 */
export function findPositionInCode(text: string, code: string) {
  const lines = code.split('\n');
  const lineNum = lines.findIndex(line => line.includes(text));

  if (lineNum === -1) {
    return null;
  }

  let chNum = lines[lineNum].indexOf(text);

  if (text.startsWith(' ')) {
    chNum += 1;
  }

  return new vscode.Position(lineNum, chNum);
}

export function findMatchKey(langObj, text) {
  for (const key in langObj) {
    if (langObj[key] === text) {
      return key;
    }
  }

  return null;
}

/**
 * 获取文件夹下所有文件
 * @function getAllFiles
 * @param  {string} dir Dir path string.
 * @return {string[]} Array with all file names that are inside the directory.
 */
export const getAllFiles = dir =>
  fs.readdirSync(dir).reduce<string[]>((files, file) => {
    // 避免读取node_modules造成性能问题
    if (file === 'node_modules') {
      return [...files];
    }
    const name = path.join(dir, file);
    const isDirectory = fs.statSync(name).isDirectory();
    return isDirectory ? [...files, ...getAllFiles(name)] : [...files, name];
  }, []);

/**
 * 获取文件 Json
 */
export function getLangJson(fileName) {
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
export const getConfiguration = text => {
  let value = vscode.workspace.getConfiguration('better-i18n-linter').get(text) as string;
  let kiwiConfigJson = getConfigFile();
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
export const getConfigFile = () => {
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
export const getKiwiLinterConfigFile = () => {
  let kiwiConfigJson = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/.kiwi`;
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
export function translateText(text) {
  const googleApiKey = getGoogleApiKey();
  const { translate: googleTranslate } = require('google-translate')(googleApiKey);

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
export function getTargetLangPath(currentFilePath): string | string[] {
  const configFile = `${vscode.workspace.workspaceFolders![0].uri.fsPath}/.kiwi`;
  let targetLangPath = '';

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
 * 获取当前文件对应的项目路径
 */
export function getCurrentProjectLangPath() {
  const targetLangPath = getTargetLangPath(vscode.window.activeTextEditor!.document.uri.path);
  if (Array.isArray(targetLangPath)) {
    return `{${targetLangPath.join(',')}}**/*.{ts,js}`;
  }
  if (targetLangPath) {
    return `${targetLangPath}**/*.{ts,js}`;
  }
  return '';
}

/**
 * 获取当前文件对应的语言路径
 */
export function getLangPrefix() {
  const langPrefix = getTargetLangPath(vscode.window.activeTextEditor!.document.uri.path);
  return Array.isArray(langPrefix) ? langPrefix.pop() || '' : langPrefix;
}
