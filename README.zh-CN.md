<div align="center">
  <h1>MediaUse 站点插件示例</h1>
  <p><strong>面向 MediaUse 的开源站点插件示例</strong></p>
  <p>提供可复用的清单、浏览器工作流和页面脚本，用于扩展各站点能力。</p>
  <p>
    <a href="./README.md">English</a>
    &nbsp;|&nbsp;
    <a href="./README.zh-CN.md">简体中文</a>
  </p>
  <p>
    <a href="./.github/skills/site-plugin-creation/SKILL.md">站点插件创建 Skill</a>
    &nbsp;·&nbsp;
    <a href="./docs/PLUGIN_BUILD_GUIDE.md">插件构建指南</a>
    &nbsp;·&nbsp;
    <a href="https://mediause.dev/">MediaUse 官网</a>
    &nbsp;·&nbsp;
    <a href="./LICENSE">Apache 2.0 许可证</a>
  </p>
  <p>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="Apache 2.0 许可证">
    </a>
    <img src="https://img.shields.io/badge/插件格式-YAML%20%2B%20JavaScript-5A67D8" alt="YAML 与 JavaScript">
  </p>
</div>

---

## 项目概述

本仓库提供 MediaUse 的**站点插件源码和示例**，不包含 MediaUse CLI、运行时或其他核心代码。

每个插件声明特定网站的命令及其浏览器工作流。兼容的 MediaUse 运行时会加载这些资源，并向调用方提供插件声明的能力。

本仓库中的插件是源码目录，不是独立应用或 npm 包。主要组成部分如下：

- `manifest.yaml`：插件元数据、命令定义和参数 schema。
- `workflows/`：将浏览器动作组合成操作的 YAML 工作流。
- `scripts/`：可选的页面端 JavaScript 辅助脚本。
- `tests/`：回归用例示例（部分插件已提供）。

## 插件目录结构

```text
<site>/
├── manifest.yaml
├── workflows/
│   └── *.yaml
├── scripts/
│   └── *.js
└── tests/
    └── cases.test.yaml
```

不同站点的文件可能有所不同。部分现有插件尚未包含 `tests/` 目录；新增插件时建议尽可能添加回归用例。

## 插件示例

| 插件 | 能力示例 | 源码 |
| --- | --- | --- |
| Bilibili | 账号、搜索、读取、用户及互动工作流 | [`manifest.yaml`](./bilibili/manifest.yaml) |
| 小红书 | 发布、搜索、信息流和用户工作流 | [`manifest.yaml`](./xiaohongshu/manifest.yaml) |
| LinkedIn | 搜索、个人资料和 Sales Navigator 工作流 | [`manifest.yaml`](./linkedin/manifest.yaml) |

以上是插件格式示例。具体可用命令取决于各插件的 manifest 以及加载插件的运行时。

## 安装插件

使用兼容的 MediaUse CLI 从本地源码安装插件。`--path` 可以指定插件集合根目录（其中包含 `<site>/`），也可以直接指定站点目录（其中包含 `manifest.yaml`）。

在插件仓库克隆目录的根目录执行：

```bash
mediause plugin add bilibili --path .
```

也可以直接指定站点目录：

```bash
mediause plugin add bilibili --path ./bilibili
```

CLI 会校验 manifest 及其引用的文件，然后将完整插件目录复制到 MediaUse 用户数据目录下的 `plugins/<site>`。如果同一 site id 的用户安装目录已存在，校验通过的新源码会替换旧目录。可通过以下命令确认插件是否可用：

```bash
mediause plugin list
mediause bilibili --help
```

不带 `--path` 的 `mediause plugin add <site>` 只会报告已经可用的插件，不会从本仓库复制或安装文件。

## 使用插件

执行插件需要兼容的 MediaUse 运行时。站点命令的一般格式如下：

```text
mediause <site> <capability> <action> [args]
```

例如，加载了 Bilibili 插件的运行时可以提供以下命令：

```bash
mediause bilibili search video --query "MediaUse"
```

## 构建与验证

插件以 YAML 和 JavaScript 源码资源的形式编写。本仓库没有独立编译器、CLI 或根目录构建脚本，因此这里没有可单独构建的二进制文件。

关于插件编写、校验、运行时冒烟测试和交付步骤，请参阅[插件构建指南](./docs/PLUGIN_BUILD_GUIDE.md)。

## 站点插件创建 Skill

本仓库提供一个按需调用的 Copilot skill，用于创建或更新站点插件。它会指导 Agent 调研真实页面、按 DSL 规范编写 manifest 和工作流、添加页面脚本与回归用例，并基于实测证据进行验证。该 skill 仅处理插件资源，不会创建 MediaUse 运行时或核心代码。

- **查看 Skill：** [站点插件创建 `SKILL.md`](./.github/skills/site-plugin-creation/SKILL.md)
- **在 Copilot Chat 中调用：** `/site-plugin-creation`

调用示例：

```text
为 https://www.google.com/ 创建一个插件。先检查真实页面，再添加 manifest、工作流、脚本和回归用例，并说明验证结果与能力限制。
```
