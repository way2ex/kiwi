import { Command } from 'vscode';
import { TargetString } from '../search-text/types';

export interface ExtractI18nArgs {
  targets: TargetString[];
  key?: string;
  value: string;
  autoGenerateKey: boolean;
}
export const EXTRACT_I18N: Command = {
  title: 'Extract Choosen Chinese',
  command: 'better-i18n-linter.extractI18N'
};

export const EXTRACT_ALL_I18N: Command = {
  title: 'Extract Chinese',
  command: 'better-i18n-linter.extractAllI18N'
};
