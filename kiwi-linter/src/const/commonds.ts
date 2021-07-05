import { Command } from 'vscode';
import { TargetString } from '../search-text/types';

export interface ExtractI18nArgs {
  targets: TargetString[];
  key?: string;
  value: string;
  autoGenerateKey: boolean;
}
export const EXTRACT_I18N: Command = {
  title: 'extract i18n variable',
  command: 'better-i18n-linter.extractI18N'
};
