import * as babel from '@babel/core';
import { DOUBLE_BYTE_REGEX } from './const';
import * as ts from 'typescript';
import { ASTElement } from 'vue-template-compiler';
function transerI18n(code, filename, lang) {
  if (lang === 'ts') {
    return typescriptI18n(code, filename);
  } else {
    return javascriptI18n(code, filename);
  }
}
function typescriptI18n(code, fileName) {
  const arr: string[] = [];
  const ast = ts.createSourceFile('', code, ts.ScriptTarget.ES2015, true, ts.ScriptKind.TS);
  function visit(node: ts.Node) {
    switch (node.kind) {
      case ts.SyntaxKind.StringLiteral: {
        /** 判断 Ts 中的字符串含有中文 */
        const { text } = node as ts.StringLiteral;
        if (text.match(DOUBLE_BYTE_REGEX)) {
          arr.push(text);
        }
        break;
      }
    }
    ts.forEachChild(node, visit);
  }
  ts.forEachChild(ast, visit);
  return arr;
}
function javascriptI18n(code, filename) {
  const arr: string[] = [];
  const visitor = {
    StringLiteral(path) {
      if (path.node.value.match(DOUBLE_BYTE_REGEX)) {
        arr.push(path.node.value);
      }
    }
  };
  const arrayPlugin = { visitor };
  babel.transform(code.toString(), {
    filename,
    plugins: [arrayPlugin]
  });
  return arr;
}
//必须将模板语法中的所有待翻译语句翻译完成才能进行ast的string解析
function findVueText(ast: ASTElement, code: string) {
  const arr: unknown[] = [];
  const regex1 = /`(.+?)`/g;
  function emun(ast) {
    if (Array.isArray(ast.attrsList)) {
      ast.attrsList.forEach(attr => {
        const { value } = attr;
        const attrStr = code.slice(attr.start, attr.end);
        const start = attr.start + attrStr.indexOf(value);
        const end = start + value.length;
        if (DOUBLE_BYTE_REGEX.test(value)) {
          arr.push({
            text: value,
            start,
            end,
            isAttr: true,
            attrInfo: attr
          });
        }
      });
    }
    if (ast.expression) {
      const text = ast.expression.match(regex1);
      if (text && text[0].match(DOUBLE_BYTE_REGEX)) {
        text.forEach(itemText => {
          itemText.match(DOUBLE_BYTE_REGEX) && arr.push({ text: itemText, start: ast.start, end: ast.end });
        });
      }
    } else {
      ast.children &&
        ast.children.forEach(item => {
          emun(item);
        });
    }
  }
  emun(ast);
  return arr;
}
export { transerI18n, findVueText };
