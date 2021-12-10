import * as vscode from 'vscode';
let _channel: null | vscode.OutputChannel;
export function getChannel(): vscode.OutputChannel {
  if (!_channel) {
    _channel = vscode.window.createOutputChannel('better-i18n-linter');
  }
  return _channel;
}
