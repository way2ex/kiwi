# 🐤 kiwi linter
> 本插件 fork 于[阿里巴巴的官方仓库](https://github.com/zhuqingguang/kiwi)，在其基础上进行优化与扩展，支持更灵活的使用方式。感谢阿里巴巴同学的工作，如果本仓库侵犯了您的权利，可以联系我~


kiwi 的 `VS Code`插件工具，主要用于检测代码中的中文，高亮出中文字符串，并一键提取中文字符串到对应的语言 Key 库。

同时优化开发体验，在 `VS Code` 中提供搜索中文，提示国际化值对应的中文功能。

## 如何使用

> VS Code 插件搜索 better-i18n-linter 安装

> 推荐与[🐤 Kiwi-国际化全流程解决方案](https://github.com/alibaba/kiwi)结合使用


![演示](https://img.alicdn.com/tfs/TB1EYENfTnI8KJjy0FfXXcdoVXa-1006-368.gif)

![展示](https://img.alicdn.com/tfs/TB1pzAIC4YaK1RjSZFnXXa80pXa-884-308.png)

## 配置项

### better-i18n-linter.langPrefix

default: `.kiwi/zh-CN/`

多语言文件的位置, kiwi linter将根据目录内的多语言文件提取对应语言(默认为中文`zh-CN`)高亮.
可以参考的目录结构如下:
![示例目录结构](./assets/i18n-folder-structure.gif)

### better-i18n-linter.i18nFilesPattern

default: `**/src/**/*.+(vue|js*|html|ts*)`

待扫描的文件类型，可以基于 [minimatch](https://github.com/isaacs/minimatch) 规则进行自定义。

### better-i18n-linter.markStringLiterals

default: `true`

是否标红中文字符串，默认开启。

### better-i18n-linter.showOverviewRuler

default: `true`

右侧滚动条中，是否显示对应的待提取中文高亮。

![](https://img.alicdn.com/tfs/TB1CHZRrxGYBuNjy0FnXXX5lpXa-1088-568.png)

### better-i18n-linter.markColor

default: `#ff4400`

待提取文字，高亮颜色。

### better-i18n-linter.enableReplaceSuggestion

default: `true`

是否开启一键提取中文功能。


## 多工程支持
> 这个是原有的功能，不过采用了配置文件的方式而不是 VS Code 配置的方式进行配置。
支持多个文件夹使用各自不同的语言包配置，只需在项目根目录下创建 `.kiwi` 文件，写入配置即可：
```json
{
    "importStatement": "import { I18N } from '@/common/i18n';",
    "projects": [
        {
            "target": "packages/package-a",
            "kiwiDir": [
                "packages/common/src/lang",
                "packages/package-a/src/lang"
            ]
        }
    ]
}
```
- `importStatement`: string, 当在没有导入过 `I18N` 的文件中自动提取中文时，会自动插入导入的语句。
- `projects.target`: string, 目标文件所在的目录前缀，内部使用 `fileUri.indexOf(target)` 的方式判断是否应用该工程配置；
- `projects.kiwiDir`: string | string[], 中文包所在的目标目录，可以配置一个或多个；
- `projects.importStatement`: string, 本工程对应的自动导入的语句；

> 配置中的所有路径均为相对于工程的相对路径。

## VS code 命令

### 在全部代码库中查找国际化文案
默认快捷键是 `cmd + ctrl + r`.


### 在当前文件中查找国际化文案
默认快捷键是 `cmd + ctrl + f`.

![](https://img.alicdn.com/tfs/TB1dzf8rpOWBuNjy0FiXXXFxVXa-1256-700.png)

