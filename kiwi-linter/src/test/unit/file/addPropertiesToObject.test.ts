import { expect } from 'chai';
import { addPropertiesToObject } from '../../../pure-utils';

describe('Insert key value list to export default{} code', () => {
  it('simple object', () => {
    const code = `export default {}`;
    const kvList = [
      { key: 'k1', value: 'v1' },
      { key: 'k2', value: 'v2' }
    ];
    const result = addPropertiesToObject(code, kvList);
    expect(result)
      .to.include('k1')
      .include('v1');
  });

  it('export default object with destruction', () => {
    const code = `
        import a from './a.ts';
        export default {
            ...a,
        }
      `;
    const kvList = [
      { key: 'k1', value: 'v1' },
      { key: 'k2', value: 'v2' }
    ];
    const result = addPropertiesToObject(code, kvList);
    expect(result)
      .to.include('k1')
      .include('v1');
  });
});
