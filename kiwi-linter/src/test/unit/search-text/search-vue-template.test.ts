import { expect } from 'chai';
import { searchVue } from '../../../search-text/search-vue-sfc';

describe('Search Vue Template Test', () => {
  it('simple props', () => {
    const code = `<template><input placeholder="请输入用户名" /></template><script>export default {}</script>`;
    const result = searchVue(code);
    expect(result).to.deep.equal([
      {
        content: '请输入用户名',
        type: 0,
        start: 30,
        end: 36,
        source: {
          start: 17,
          end: 37,
          content: 'placeholder="请输入用户名"'
        }
      }
    ]);
  });
  it('v-bind prop expression', () => {
    const code = `<template><input :placeholder="'请输入用户名' + num" /></template><script>export default {}</script>`;
    const result = searchVue(code);
    expect(result).to.deep.equal([
      {
        content: '请输入用户名',
        type: 1,
        start: 32,
        end: 38,
        source: {
          start: 31,
          end: 39,
          content: "'请输入用户名'"
        }
      }
    ]);
  });
  it('v-bind prop template string expression', () => {
    const code = `<template><input :placeholder="\`请输入用户名$\{num}个\` + '少年郎'" /></template><script>export default {}</script>`;
    const result = searchVue(code);
    expect(result).to.deep.equal([
      {
        content: '请输入用户名${num}个',
        type: 2,
        start: 32,
        end: 45,
        source: {
          content: '`请输入用户名${num}个`',
          start: 31,
          end: 46
        },
        expressions: [
          {
            content: 'num',
            start: 40,
            end: 43
          }
        ]
      },
      {
        content: '少年郎',
        type: 1,
        start: 50,
        end: 53,
        source: {
          content: "'少年郎'",
          start: 49,
          end: 54
        }
      }
    ]);
  });

  it('template string expression', () => {
    const code = `<template><div>\n哈哈\n<div>\n这是有\n{{num + '个'}}苹果，\n谁想吃\n两口</div></div></template><script>export default {}</script>`;
    const result = searchVue(code);
    expect(result).to.deep.equal([
      {
        content: '哈哈',
        type: 3,
        start: 16,
        end: 18,
        source: {
          content: '\n哈哈\n',
          start: 15,
          end: 19
        }
      },
      {
        content: '这是有',
        type: 3,
        start: 25,
        end: 28,
        source: {
          content: '\n这是有\n',
          start: 24,
          end: 29
        }
      },
      {
        content: '个',
        type: 1,
        start: 38,
        end: 39,
        source: {
          start: 37,
          end: 40,
          content: "'个'"
        }
      },
      {
        content: '苹果',
        type: 3,
        start: 42,
        end: 44,
        source: {
          content: '苹果，\n谁想吃\n两口',
          start: 42,
          end: 52
        }
      },
      {
        content: '谁想吃',
        type: 3,
        start: 46,
        end: 49,
        source: {
          content: '苹果，\n谁想吃\n两口',
          start: 42,
          end: 52
        }
      },
      {
        content: '两口',
        type: 3,
        start: 50,
        end: 52,
        source: {
          content: '苹果，\n谁想吃\n两口',
          start: 42,
          end: 52
        }
      }
    ]);
  });
});
