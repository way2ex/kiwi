import { Uri, WorkspaceFolder, window, workspace, Disposable } from 'vscode';
import { sync } from 'glob';
import { getLangDataByPaths } from './getLangData';
import { readJSONSync } from 'fs-extra';

interface IProjectConfig {
  target: string;
  kiwiDir: string[];
  importStatement?: string;
}
interface IConfiguration {
  // 中文语言包的前缀，相对于工程根目录的相对路径，如 packages/A/src/lang/zh-CN
  kiwiDir: string[];
  // 导入 I18N 的表达式,如
  importStatement?: string;
  // 需要检测 i18n 表达式的文件 pattern
  i18nFilesPattern: string;
  // workspace中的多子包配置
  projects: IProjectConfig[];
}
const DEFAULT_CONFIG: IConfiguration = {
  kiwiDir: [],
  i18nFilesPattern: 'src/**/*.{js,jsx,ts,tsx,vue}',
  projects: []
};

export class Workspace {
  uri: Uri;
  config: IConfiguration;
  constructor(wsfolder: WorkspaceFolder, config: Partial<IConfiguration>) {
    this.uri = wsfolder.uri;
    this.config = Object.assign({}, DEFAULT_CONFIG, config);
  }
  isCurrentWorkspace(): boolean {
    return window.activeTextEditor!.document.uri.fsPath.startsWith(this.uri.path);
  }
  private getLangPathList(pathList: string[]): string[] {
    const pathGlob = pathList
      .map(dir => {
        return `${this.uri.fsPath}/${dir}/zh-CN`;
      })
      .join(',');
    try {
      const result = sync(`${pathList.length > 1 ? `{${pathGlob}}` : pathGlob}/**/*.{ts,js}`);
      return result;
    } catch (e) {
      return [];
    }
  }

  /**
   * 获取配置中配置的所有中文包路径
   * @param allPath 是否返回所有路径
   * @returns
   */
  getLangPaths(allPath = false): string[] {
    const filePath = window.activeTextEditor!.document.uri.fsPath;
    const pathList = [
      ...this.config.kiwiDir,
      ...this.config.projects
        .filter(project => allPath || filePath.includes(project.target))
        .reduce<string[]>((acc, cur) => {
          acc.push(...cur.kiwiDir);
          return acc;
        }, [])
    ];
    const res = this.getLangPathList([...new Set(pathList)]);
    console.log('当前语言包路径', res);
    return res;
  }

  /**
   * 获取当前 workspace 下配置的语言包路径
   * @returns
   */
  getTargetLangData(): Record<string, string> {
    const paths = this.getLangPaths();
    const data = getLangDataByPaths(paths);
    return data;
  }
  /**
   * 获取所有的中文文案
   */
  getAllLangData(): Record<string, string> {
    return getLangDataByPaths(this.getLangPaths(true));
  }
}

export class WorkspaceManager {
  private workspaces: Workspace[] = [];
  private static instance: WorkspaceManager | null = null;
  private disposables: Disposable[] = [];
  constructor() {
    if (WorkspaceManager.instance) {
      return WorkspaceManager.instance;
    }
    this.init();
    this.disposables.push(
      workspace.onDidChangeWorkspaceFolders(() => {
        this.init();
      })
    );

    WorkspaceManager.instance = this;
  }
  private init() {
    this.workspaces = [] as Workspace[];
    (workspace.workspaceFolders || []).forEach(workspace => {
      const configFile = workspace.uri.fsPath + '/.kiwi';
      try {
        const config = readJSONSync(configFile, { encoding: 'utf8' });
        this.workspaces.push(new Workspace(workspace, config));
      } catch {
        // console.error(e);
      }
    });
  }

  public destroy(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    WorkspaceManager.instance = null;
  }

  get length(): number {
    return this.workspaces.length;
  }

  getCurrentWorkspace(): Workspace {
    return this.workspaces.find(workspace => workspace.isCurrentWorkspace())!;
  }

  /**
   * 获取所有workspace下的所有语言包的中文文案
   * @returns
   */
  getAllLangData(): Record<string, string> {
    return this.workspaces.reduce<Record<string, string>>((acc, cur) => {
      Object.assign(acc, cur.getAllLangData());
      return acc;
    }, {});
  }
}

export const workspaceManager = new WorkspaceManager();
