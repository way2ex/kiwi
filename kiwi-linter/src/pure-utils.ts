import { DOUBLE_BYTE_REGEX2 } from './pure-const';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { ObjectExpression } from '@babel/generator/node_modules/@babel/types';
import * as prettier from 'prettier';
import { parse } from '@babel/parser';
import babelGenerate from '@babel/generator';
import { generate } from '@vue/compiler-core';
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

export function addPropertiesToObject(code: string, properties: { key: string; value: string }[]): string {
  const ast = parse(code, {
    sourceType: 'module'
  });
  traverse(ast, {
    ObjectExpression(path) {
      if (!path.parentPath?.isExportDefaultDeclaration()) {
        path.skip();
      }
      path.node.properties.unshift(
        ...properties.map(({ key, value }) => {
          const v = t.stringLiteral(value);
          return t.objectProperty(t.identifier(key), v) as any;
        })
      );
    }
  });
  const newCode = babelGenerate(ast);
  const c = prettier.format(newCode.code, {
    tabWidth: 4,
    useTabs: false,
    singleQuote: true
  });
  console.log(c);

  return c;
}

addPropertiesToObject(
  `
    export default {};
`,
  [{ key: '77', value: '5jkddkdkdk' }]
);
