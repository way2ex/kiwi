import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { hasChinese } from '../pure-utils';

import { StringSource, TargetString, TargetTypes } from './types';

export function searchJs(code: string, offset = 0): TargetString[] {
  const result: TargetString[] = [];
  const ast = parser.parse(code, {
    sourceType: 'module',
    plugins: ['typescript']
  });
  traverse(ast, {
    enter(path) {
      const { start, end, value, extra } = path.node as any;
      if (t.isStringLiteral(path.node) || t.isDirectiveLiteral(path.node)) {
        // console.log(path.node);
        const source: StringSource = {
          start: start + offset,
          end: end + offset,
          content: extra.raw
        };
        if (hasChinese(value)) {
          result.push({
            content: value,
            type: TargetTypes.EXPRESSION,
            start: start + 1 + offset,
            end: end - 1 + offset,
            source
          });
        }
      } else if (t.isTemplateLiteral(path.node)) {
        const { expressions } = path.node;
        if (
          path.node.quasis.some(item => {
            if (t.isTemplateElement(item) && hasChinese(item.value.raw)) {
              return true;
            }
          })
        ) {
          const source: StringSource = {
            start: start + offset,
            end: end + offset,
            content: code.slice(start, end)
          };
          result.push({
            content: code.slice(start + 1, end - 1),
            type: TargetTypes.TEMPLATE_EXPRESSION,
            start: start + 1 + offset,
            end: end - 1 + offset,
            expressions: expressions.map(node => {
              const { start, end } = node as any;
              const exp: StringSource = {
                start: start + offset,
                end: end + offset,
                content: code.slice(start, end)
              };
              return exp;
            }),
            source
          });
        }
        path.skip();
      }
    }
  });
  return result;
}
