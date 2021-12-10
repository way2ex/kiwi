/**
 * @author linhuiw
 * @desc 获取语言文件
 */
import { getLangJson } from './utils';
import * as fs from 'fs';

/**
 * 获取对应文件的语言
 */
export function getLangData(fileName: string): Record<string, unknown> {
  if (fs.existsSync(fileName)) {
    return getLangJson(fileName);
  } else {
    return {};
  }
}

export function getLangDataByPaths(pathList: string[]): Record<string, string> {
  return pathList.reduce((prev, curr) => {
    const fileContent = getLangJson(curr);
    const jsObj = fileContent;
    return {
      ...prev,
      ...jsObj
    };
  }, {});
}
