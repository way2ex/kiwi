import { searchJs } from '../../../search-text/search-js';
import { expect } from 'chai';

describe('Search Typescript Test', () => {
  it('simple typescript code', () => {
    const code = "const a: string = `这里有${ num + '个' }个中国人`";
    const result = searchJs(code);
    expect(result).to.deep.equal([
      {
        content: "这里有${ num + '个' }个中国人",
        type: 2,
        start: 19,
        end: 40,
        source: {
          content: "`这里有${ num + '个' }个中国人`",
          start: 18,
          end: 41
        },
        expressions: [
          {
            start: 25,
            end: 34,
            content: "num + '个'"
          }
        ]
      }
    ]);
  });
});
