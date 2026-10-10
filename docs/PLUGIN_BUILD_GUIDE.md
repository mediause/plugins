# Plugin Build Guide

This guide covers how to create, validate, and deliver a site plugin in this repository.

> This repository contains plugin source assets and examples only. It does not include the MediaUse CLI or runtime.

## Agent-Assisted Plugin Creation

For a guided workflow that follows the manifest, workflow, script, and validation conventions, use the [Site Plugin Creation skill](../.github/skills/site-plugin-creation/SKILL.md). In Copilot, it is available as `/site-plugin-creation`.

## Build Model

A plugin is a site folder containing a manifest, YAML workflows, and optional JavaScript helpers. A compatible MediaUse runtime interprets these files; the plugin folder itself is the deliverable.

There is no standalone compilation step in this repository: it has no `Cargo.toml`, `package.json`, or build script. Building the MediaUse runtime or packaging its distribution is outside this repository.

## Installing into a MediaUse Runtime

With a compatible MediaUse CLI, install a local plugin using:

```bash
mediause plugin add <site> --path <path>
```

`--path` accepts either the plugin's own directory or a collection root containing `<site>/manifest.yaml`. For example, from this repository's root:

```bash
mediause plugin add bilibili --path .
```

Or point directly to the site folder:

```bash
mediause plugin add bilibili --path ./bilibili
```

The CLI validates the manifest and referenced workflow/script files, then copies the complete plugin directory to the runtime's configured user data `plugins/<site>` directory. If that directory already exists for the same site id, the validated source replaces it. A failed validation leaves the previous installed directory unchanged. Confirm installation with `mediause plugin list`.

Without `--path`, `mediause plugin add <site>` only reports a plugin that is already available; it cannot install a plugin from this repository.

## Plugin Structure

Create a folder at the repository root for the site:

```text
example_site/
├── manifest.yaml
├── workflows/
│   └── search.yaml
├── scripts/
│   └── example_site.site.js
└── tests/
    └── cases.test.yaml
```

Keep the folder name, `name`, and `platform` consistent. Use a plugin ID prefixed with `plugin.`.

## 1. Define the Manifest

`manifest.yaml` declares the plugin identity and maps a capability/action pair to a workflow operation:

```yaml
name: example_site
id: plugin.example_site
platform: example_site
version: "1.0.0"
description: "Example site plugin"

commands:
  search:
    posts:
      workflow: workflows/search.yaml
      operation: posts
      description: "Search posts"
      params:
        - name: keyword
          type: string
          required: true
```

The example declares `search posts`, which a compatible runtime can expose as:

```text
mediause example_site search posts --keyword "MediaUse"
```

Use `auth` metadata when the site needs login configuration. If a workflow depends on shared JavaScript helpers, list their paths under `shared_libs`, for example:

```yaml
shared_libs:
  - scripts/example_site.site.js
```

Manifest paths are relative to the plugin folder. Workflow paths must use the `workflows/` directory and end in `.yaml`. Parameter types supported by the current manifest format are `string`, `number`, `boolean`, `array`, and `object`.

## 2. Add a Workflow

The manifest's `operation` must match an operation key in the referenced workflow file. Each operation contains an ordered `steps` list:

```yaml
posts:
  steps:
    - action: navigate
      url: "https://example.com/search?q={{keyword}}"
    - action: evaluate
      script: "document.title"
```

Use browser actions supported by the consuming MediaUse runtime. Keep page interaction and extraction in the workflow or page-side helpers; do not treat a workflow as a standalone script.

## 3. Add Scripts and Regression Cases

Scripts are optional. Use them for reusable page-side helpers, then register each shared script in `manifest.yaml`. Keep workflow orchestration in YAML.

Add `tests/cases.test.yaml` with representative command cases when possible:

```yaml
- id: example_search_posts
  description: "Example plugin exposes post search"
  capability: search
  action: posts
  params:
    keyword: "MediaUse"
  expect:
    success: true
```

The case file documents expected behavior for a compatible test harness. This repository does not provide a standalone test runner.

For real-world examples, see the [Bilibili manifest](../bilibili/manifest.yaml), [Bilibili search workflow](../bilibili/workflows/search.yaml), and [Xiaohongshu test cases](../xiaohongshu/tests/cases.test.yaml).

## 4. Validate the Plugin

Before sharing a plugin:

1. Check that the manifest is valid YAML and that each command references an existing workflow file and operation.
2. Check that every file listed in `shared_libs` exists under `scripts/`.
3. Confirm that each workflow action is supported by the consuming runtime and that parameters match the manifest.
4. If Node.js is available, use `node --check` on each JavaScript file. For example:

   ```bash
   node --check xiaohongshu/scripts/xiaohongshu.site.js
   ```

5. Run a smoke test through a compatible MediaUse runtime. This repository does not contain the runtime needed for end-to-end execution.

## 5. Deliver the Plugin

Commit the complete site folder, including its manifest, referenced workflows, registered scripts, and regression cases. No generated binary or package archive is required by this repository.

The MediaUse CLI and runtime build remain outside this plugins-only repository. Use an installed compatible CLI with the local-path command above to install and verify the plugin assets.
