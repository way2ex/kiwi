import { StringSource, TargetString, TargetTypes } from './types';
import { TemplateChildNode, NodeTypes } from '@vue/compiler-core';
import { parse } from '@vue/compiler-sfc';
import { hasChinese } from '../pure-utils';
import { searchJs } from './search-js';
import { CHINESE_TEXT_PATTERN } from '../pure-const';

function searchTextInAst(childNode: TemplateChildNode): TargetString[] {
  const result: TargetString[] = [];
  if (childNode.type === NodeTypes.ELEMENT) {
    // element
    const { children, props } = childNode;
    props.forEach(prop => {
      const { loc } = prop;
      const source: StringSource = {
        start: loc.start.offset,
        end: loc.end.offset,
        content: loc.source
      };
      if (prop.type === NodeTypes.ATTRIBUTE) {
        const { value } = prop;
        if (value?.type === NodeTypes.TEXT && hasChinese(value.content)) {
          // normal text
          result.push({
            type: TargetTypes.ATTRIBUTE,
            content: value.content,
            start: value.loc.start.offset + 1,
            end: value.loc.end.offset - 1,
            source
          });
        }
      } else if (prop.type === NodeTypes.DIRECTIVE) {
        if (prop.exp?.type === NodeTypes.SIMPLE_EXPRESSION && hasChinese(prop.exp.content)) {
          // simple expression
          result.push(...searchJs(prop.exp.content, prop.exp.loc.start.offset));
        }
      }
    });
    children.forEach(child => {
      result.push(...searchTextInAst(child));
    });
  } else if (childNode.type === NodeTypes.TEXT) {
    // text node
    if (hasChinese(childNode.content)) {
      const start = childNode.loc.start.offset;
      const end = childNode.loc.end.offset;
      const source = {
        start,
        end,
        content: childNode.loc.source
      };
      [...childNode.loc.source.matchAll(CHINESE_TEXT_PATTERN)].forEach(match => {
        result.push({
          type: TargetTypes.VUE_TEXT,
          content: match[0],
          start: match.index! + start,
          end: match.index! + start + match[0].length,
          source
        });
      });
    }
  } else if (childNode.type === NodeTypes.INTERPOLATION) {
    // interpolation expression
    if (childNode.content.type === NodeTypes.SIMPLE_EXPRESSION && hasChinese(childNode.content.content)) {
      result.push(...searchJs(childNode.content.loc.source, childNode.content.loc.start.offset));
    }
  }
  return result;
}
/**
 * @author justin
 * @desc 搜索 vue 中的汉字
 */
export function searchVue(source: string): TargetString[] {
  const result: TargetString[] = [];
  const descriptor = parse(source).descriptor;
  if (descriptor.template?.type === 'template') {
    const searchRes = searchTextInAst(descriptor.template.ast);
    result.push(...searchRes);
  }
  if (descriptor.script?.type === 'script') {
    const { content, loc } = descriptor.script;
    const searchRes = searchJs(content, loc.start.offset);
    result.push(
      ...searchRes.map(res => ({
        ...res,
        isInSfcScript: true
      }))
    );
  }
  return result;
}
