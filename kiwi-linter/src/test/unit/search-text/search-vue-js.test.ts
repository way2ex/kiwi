import { expect } from 'chai';
import { searchVue } from '../../../search-text/search-vue-sfc';

describe('Search Vue Script Test', () => {
  it('simple expression', () => {
    const code = `<template><input placeholder="dddd" /></template><script>export default {data() { return { content: "这是汉字hshsh啊", } }}</script>`;
    const result = searchVue(code);
    expect(result).to.deep.equal([
      {
        content: '这是汉字hshsh啊',
        type: 1,
        start: 101,
        end: 111,
        isInSfcScript: true,
        source: {
          start: 100,
          end: 112,
          content: '"这是汉字hshsh啊"'
        }
      }
    ]);
  });
});
