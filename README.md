<div align="center">
  <h1>MediaUse Site Plugins Examples</h1>
  <p><strong>Open-source site plugin examples for MediaUse</strong></p>
  <p>Reusable manifests, browser workflows, and page-side scripts for website-specific capabilities.</p>
  <p>
    <a href="./README.md">English</a>
    &nbsp;|&nbsp;
    <a href="./README.zh-CN.md">简体中文</a>
  </p>
  <p>
    <a href="./.github/skills/site-plugin-creation/SKILL.md">Site Plugin Creation Skill</a>
    &nbsp;·&nbsp;
    <a href="./docs/PLUGIN_BUILD_GUIDE.md">Plugin Build Guide</a>
    &nbsp;·&nbsp;
    <a href="https://mediause.dev/">MediaUse</a>
    &nbsp;·&nbsp;
    <a href="./LICENSE">Apache 2.0 License</a>
  </p>
  <p>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-Apache%202.0-blue.svg" alt="Apache 2.0">
    </a>
    <img src="https://img.shields.io/badge/Plugin%20format-YAML%20%2B%20JavaScript-5A67D8" alt="YAML and JavaScript">
  </p>
</div>

<p align="center">
  <a href="#overview">Overview</a> ·
  <a href="#plugin-layout">Plugin Layout</a> ·
  <a href="#examples">Examples</a> ·
  <a href="#installing-a-plugin">Installing a Plugin</a> ·
  <a href="#agent-skill-site-plugin-creation">Agent Skill</a> ·
  <a href="#build-and-validation">Build and Validation</a>
</p>

---

## Overview

This repository contains **site plugin source assets and examples** for MediaUse. It does not include the MediaUse CLI, runtime, or other core code.

Each plugin describes website-specific commands and the browser workflows behind them. A compatible MediaUse runtime loads these assets and makes the declared capabilities available to its callers.

Plugins in this repository are source folders, not standalone applications or npm packages. Their main building blocks are:

- `manifest.yaml` — plugin metadata, command definitions, and parameter schemas.
- `workflows/` — YAML workflows that compose browser actions into operations.
- `scripts/` — optional JavaScript helpers for page-side logic.
- `tests/` — regression case examples, where provided.

## Plugin Layout

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

The exact files vary by site. Some existing plugins do not yet include a `tests/` directory; new examples should add regression cases where practical.

## Examples

| Plugin | Example capabilities | Source |
| --- | --- | --- |
| Bilibili | Account, search, read, user, and engagement workflows | [`manifest.yaml`](./bilibili/manifest.yaml) |
| Xiaohongshu | Posting, search, feed, and user workflows | [`manifest.yaml`](./xiaohongshu/manifest.yaml) |
| LinkedIn | Search, profile, and Sales Navigator workflows | [`manifest.yaml`](./linkedin/manifest.yaml) |

These are examples of the plugin format; the exact commands available depend on each manifest and the consuming runtime.

## Installing a Plugin

Use a compatible MediaUse CLI to install a plugin from this repository. The `--path` value can point either to the plugin collection root (which contains `<site>/`) or directly to a site's folder (which contains `manifest.yaml`).

From the root of a local clone:

```bash
mediause plugin add bilibili --path .
```

To pass the site folder directly:

```bash
mediause plugin add bilibili --path ./bilibili
```

The CLI validates the manifest and referenced files, then copies the complete plugin folder to the MediaUse user data directory at `plugins/<site>`. If that user-installed directory already exists for the same site id, a valid new source replaces it. Verify availability with:

```bash
mediause plugin list
mediause bilibili --help
```

Without `--path`, `mediause plugin add <site>` only reports a plugin that is already available; it does not install files from this repository.

## Using a Plugin

A compatible MediaUse runtime is required to execute a plugin. Site commands follow this general form:

```text
mediause <site> <capability> <action> [args]
```

For example, a runtime that has loaded the Bilibili plugin can expose a command such as:

```bash
mediause bilibili search video --query "MediaUse"
```

## Build and Validation

Plugin modules are authored as YAML and JavaScript source assets. This repository has no standalone compiler, CLI, or root build script; there is no local binary to build here.

See the [Plugin Build Guide](./docs/PLUGIN_BUILD_GUIDE.md) for the recommended authoring, validation, runtime smoke-test, and delivery steps.

## Agent Skill: Site Plugin Creation

This repository includes an on-demand Copilot skill for creating or updating site plugins. It guides the agent through live-site research, DSL-compliant manifests and workflows, page-side scripts, regression cases, and evidence-based validation. The skill is scoped to plugin assets; it does not create MediaUse runtime or core code.

- **Read the skill:** [Site Plugin Creation `SKILL.md`](./.github/skills/site-plugin-creation/SKILL.md)
- **Invoke in Copilot Chat:** `/site-plugin-creation`

Example request:

```text
Create a plugin for https://www.google.com/ 
```
