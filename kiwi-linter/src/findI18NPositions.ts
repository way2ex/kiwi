/**
 * credits https://github.com/nefe/vscode-toolkits/blob/master/src/findI18NPositions.ts
 */

import * as _ from 'lodash';
import { getI18N } from './getLangData';
import { getActiveTextEditor, getEndOfLine } from './utils';

class Cache {
  memories = [] as Array<{ code: string; positions: Position[] }>;
  addCache(code: string, positions: Position[]) {
    this.memories.push({
      code,
      positions
    });

    if (this.memories.length > 8) {
      this.memories.shift();
    }
  }
  getPositionsByCode(code: string) {
    const mem = this.memories.find(mem => mem.code === code);
    if (mem && mem.positions) {
      return mem.positions;
    }

    return false;
  }
}

const cache = new Cache();

export class Position {
  constructor(code: string) {
    this.code = code;
    this.cn = [];
  }
  start: undefined | number;
  cn: string[];
  code: string;
  line: number | undefined;
}

/** 使用正则匹配{{}} */
function getRegexMatches(I18N, code: string): Position[] {
  const lines = code.split(getEndOfLine(getActiveTextEditor().document.eol));
  const positions: Position[] = [];
  const reg = new RegExp(/I18N((?:\.[$\w]+|\[(?:'|")[^'"[\]]+(?:'|")\])+)/g);
  lines.forEach((line, index) => {
    const matchAll = [...line.matchAll(reg)];
    const position = new Position(line);
    position.line = index;
    for (const match of matchAll) {
      const keyPath = match[1].startsWith('.') ? match[1].slice(1) : match[1];
      const transformedCn = _.get(I18N, keyPath);
      if (typeof transformedCn === 'string') {
        position.cn.push(transformedCn);
      }
    }
    positions.push(position);
  });
  return positions.filter(position => position.cn.length);
}

/**
 * 查找 I18N 表达式
 * @param code
 */
export function findI18NPositions(code: string): Position[] {
  //   const cachedPoses = cache.getPositionsByCode(code);
  //   if (cachedPoses) {
  //     return cachedPoses;
  //   }

  const I18N = getI18N();
  const positions = [] as Position[];

  const regexMatches = getRegexMatches(I18N, code);
  let matchPositions = positions.concat(regexMatches);
  matchPositions = _.uniqBy<Position>(matchPositions, (position: Position) => {
    return `${position.code}-${position.line}`;
  });

  cache.addCache(code, matchPositions);
  return matchPositions;
}
