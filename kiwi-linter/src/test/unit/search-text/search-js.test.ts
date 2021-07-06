import { searchJs } from '../../../search-text/search-js';
import { expect } from 'chai';

describe('Search Javascript Test', () => {
  it('simple double quotes expression', () => {
    const code = '"中国"';
    const result = searchJs(code);
    expect(result).to.deep.equal([
      {
        content: '中国',
        type: 1,
        start: 1,
        end: 3,
        source: {
          start: 0,
          end: 4,
          content: '"中国"'
        }
      }
    ]);
  });
  it('simple single quote expression', () => {
    const code = "'中国'";
    const result = searchJs(code);
    expect(result).to.deep.equal([
      {
        content: '中国',
        type: 1,
        start: 1,
        end: 3,
        source: {
          start: 0,
          end: 4,
          content: "'中国'"
        }
      }
    ]);
  });
  it('complex quote expression', () => {
    const code = "'中国' + num + '人'";
    const result = searchJs(code);
    expect(result).to.deep.equal([
      {
        content: '中国',
        type: 1,
        start: 1,
        end: 3,
        source: {
          content: "'中国'",
          start: 0,
          end: 4
        }
      },
      {
        content: '人',
        type: 1,
        start: 14,
        end: 15,
        source: {
          content: "'人'",
          start: 13,
          end: 16
        }
      }
    ]);
  });

  it('template string expression', () => {
    const code = '`这里有${num}个中国人` + "啊"';
    const result = searchJs(code);
    expect(result).to.deep.equal([
      {
        content: '这里有${num}个中国人',
        type: 2,
        start: 1,
        end: 14,
        source: {
          content: '`这里有${num}个中国人`',
          start: 0,
          end: 15
        },
        expressions: [
          {
            start: 6,
            end: 9,
            content: 'num'
          }
        ]
      },
      {
        content: '啊',
        type: 1,
        start: 19,
        end: 20,
        source: {
          content: '"啊"',
          start: 18,
          end: 21
        }
      }
    ]);
  });

  it('complex template string expression', () => {
    const code = "`这里有${ num + '个' }个中国人`";
    const result = searchJs(code);
    expect(result).to.deep.equal([
      {
        content: "这里有${ num + '个' }个中国人",
        type: 2,
        start: 1,
        end: 22,
        source: {
          content: "`这里有${ num + '个' }个中国人`",
          start: 0,
          end: 23
        },
        expressions: [
          {
            start: 7,
            end: 16,
            content: "num + '个'"
          }
        ]
      }
    ]);
  });
});
