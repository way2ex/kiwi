import { DOUBLE_BYTE_REGEX2 } from './pure-const';

export function hasChinese(str: string): boolean {
  return DOUBLE_BYTE_REGEX2.test(str);
}
