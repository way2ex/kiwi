/**
 * @author linhuiw
 * @desc 添加行内注解
 */
import * as vscode from 'vscode';
import * as _ from 'lodash';
import {
  TextEditorDecorationType,
  DecorationRangeBehavior,
  DecorationRenderOptions,
  window,
  DecorationInstanceRenderOptions,
  DecorationOptions
} from 'vscode';
import { findI18NPositions, Position } from './findI18NPositions';
import { getActiveTextEditor } from './utils';

/**
 * I18N 中文显示位置
 */
const annotationDecoration: TextEditorDecorationType = window.createTextEditorDecorationType({
  after: {
    margin: '0 0 0 3em',
    textDecoration: 'none'
  },
  rangeBehavior: DecorationRangeBehavior.ClosedOpen
} as DecorationRenderOptions);

/**
 * 转换位置
 * @param pos
 * @param editorText
 * @param toLastCol 是否是行尾
 */
export function transformPosition(pos: Position, editorText: string, toLastCol?: boolean): vscode.Range {
  const { start, code } = pos;
  const width = code.length;
  let lines, line, ch;
  if (start !== undefined) {
    lines = editorText.slice(0, start + 1).split('\n');
    /** 当前所在行 */
    line = (pos as Position).line || lines.length - 1;
    /** I18N 开始的 col */
    ch = lines[line].length;
  } else {
    lines = editorText.split('\n');
    line = (pos as Position).line;
    ch = lines[line].length;
  }

  let first, last;
  if (toLastCol) {
    const lineLastCol = _.get(editorText.split('\n'), [line, 'length']);
    first = new vscode.Position(line, lineLastCol);
    last = new vscode.Position(line, width + lineLastCol);
  } else {
    first = new vscode.Position(line, ch);
    last = new vscode.Position(line, ch + width);
  }
  return new vscode.Range(first, last);
}

/**
 * 设置行内提示
 */
export function setLineDecorations(): void {
  const activeEditor = getActiveTextEditor();
  const code = activeEditor.document.getText();
  const positions = findI18NPositions(code);
  let decorations: DecorationOptions[] = [];
  decorations = (positions || [])
    .filter(pos => pos.cn.length)
    .map(pos => {
      const toLastCol = true;
      const range = transformPosition(pos, code, toLastCol);
      return {
        range,
        renderOptions: {
          after: {
            color: '#999999',
            contentText: `🇨🇳 ${pos.cn.map(exp => exp.replace('\n', '\\n')).join(' | ')} 🐤`,
            fontWeight: 'normal',
            fontStyle: 'normal',
            textDecoration: 'none;'
          }
        } as DecorationInstanceRenderOptions
      } as DecorationOptions;
    });

  activeEditor.setDecorations(annotationDecoration, decorations);
}
