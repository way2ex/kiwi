import { searchJs } from './search-js';
import { searchVue } from './search-vue-sfc';
import { TargetString } from './types';

/**
 * @author justin
 * @desc 搜索代码中的汉字
 */
export function searchChinese(code: string, fileName: string): TargetString[] {
  if (fileName.endsWith('.vue')) {
    return searchVue(code);
  }
  return searchJs(code);
}
