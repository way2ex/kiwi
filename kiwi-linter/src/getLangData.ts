/**
 * @author linhuiw
 * @desc 获取语言文件
 */
import { flatten, getLangJson, getCurrentProjectLangPath } from './utils';
import * as globby from 'globby';
import * as fs from 'fs';
import { I18N_GLOB } from './const';

/**
 * 获取对应文件的语言
 */
export function getLangData(fileName: string) {
  if (fs.existsSync(fileName)) {
    return getLangJson(fileName);
  } else {
    return {};
  }
}
export function getI18N() {
  const _I18N_GLOB = getCurrentProjectLangPath() || I18N_GLOB;
  const paths = globby.sync(_I18N_GLOB);
  let langObj = {};
  langObj = paths.reduce((prev, curr) => {
    const fileContent = getLangData(curr);
    let jsObj = fileContent;
    return {
      ...prev,
      ...jsObj
    };
  }, {});
  return langObj;
}
/**
 * 获取全部语言, 展平
 */
export function getSuggestLangObj(): Record<string, string> {
  const langObj = getI18N();
  const finalLangObj = flatten(langObj) as any;
  return finalLangObj;
}
