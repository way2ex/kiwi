import { DOUBLE_BYTE_REGEX2 } from './pure-const';

export function hasChinese(str: string): boolean {
  return DOUBLE_BYTE_REGEX2.test(str);
}

/**
 * 将模板字符串中的模板变量替换为 val0, val1 格式
 */
export function formatTemplateString(exp: string): string {
  const matches = exp.match(/\$\{[^${}]+\}/g) || [];
  return matches.reduce((acc, cur, index) => {
    return acc.replace(cur, `{val${index}}`);
  }, exp);
}
