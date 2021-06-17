/**
 * credits https://github.com/nefe/vscode-toolkits/blob/master/src/findI18NPositions.ts
 */

import * as ts from 'typescript';
import * as vscode from 'vscode';
import * as _ from 'lodash';
import { getI18N } from './getLangData';

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
  // @ts-ignore
  start: number;
  // @ts-ignore
  cn: string[];
  // @ts-ignore
  code: string;
}

/** 使用正则匹配{{}} */
function getRegexMatches(I18N, code: string) {
  const lines = code.split('\n');
  const positions: Position[] = [];
  const reg = new RegExp(/I18N((?:\.[$\w]+|\[(?:'|")[^'"\[\]]+(?:'|")\])+)/g);
  lines.forEach((line, index) => {
    const matchAll = [ ...line.matchAll(reg) ];
    const position = new Position();
    position.code = line;
    position.cn = [];
    (position as any).line = index;
    for (let match of matchAll) {
      const keyPath = match[1].startsWith('.') ? match[1].slice(1) : match[1];
      const transformedCn = _.get(I18N, keyPath);
      if (typeof transformedCn === 'string') {
        position.cn.push(transformedCn) ;
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
export function findI18NPositions(code: string) {
  const cachedPoses = cache.getPositionsByCode(code);
  if (cachedPoses) {
    return cachedPoses;
  }

  const I18N = getI18N();
  const positions = [] as Position[];

  const regexMatches = getRegexMatches(I18N, code);
  let matchPositions = positions.concat(regexMatches);
  matchPositions = _.uniqBy<Position & { line: number }>(matchPositions as any, (position: Position & { line: number }) => {
    return `${position.code}-${position.line}`;
  });

  cache.addCache(code, matchPositions);
  return matchPositions;
}
