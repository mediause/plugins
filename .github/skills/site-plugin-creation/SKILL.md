---
name: site-plugin-creation
description: "Create or update a MediaUse site plugin in this plugins-only repository. Use when adding a site integration, manifest command, workflow, page-side script, or plugin regression case."
argument-hint: "[site] [capability/action]"
---

# Site Plugin Creation

## Goal and Scope

Create a complete, evidence-based site plugin using the repository's manifest, workflow, script, and regression-case conventions.

This repository contains plugin assets, not the MediaUse CLI or runtime. Create or update the requested site folder at the repository root. Do not add runtime or core implementation here, and do not claim that a local CLI build or end-to-end test ran when the required runtime is unavailable.

## Required Workflow

### 1. Confirm the Plugin Scope

Identify the target site, requested capabilities, required account state, expected inputs, and output data. If a decision changes the public command contract or a write operation's behavior, ask the user before choosing.

Use a unique site folder name made only of letters, digits, and underscores. Keep it consistent with `name` and `platform` in the manifest. The plugin ID must start with `plugin.`.

### 2. Inspect the Live Site

Before choosing commands, URLs, selectors, or response fields:

1. Use available browser tools to visit the live site, not only static markup or remembered page structure.
2. Visit the home page and the pages relevant to each requested capability. For list/detail features, inspect both a list page and at least one detail page.
3. Exercise the key user flow and confirm that each important locator is visible and usable.
4. Record the tested URLs, stable locators, interaction results, authentication requirements, and observed response fields.
5. Account for login walls, dialogs, lazy loading, scrolling, frames, and confirmation steps in the workflow.

Prefer stable semantic locators such as roles, labels, `href`, `aria-*`, and verified structural attributes. Do not use an unverified selector just because it looks plausible. If live inspection is unavailable, mark the affected behavior as unverified and ask for the evidence needed to continue; do not present guessed behavior as tested.

For API-backed behavior, prefer a stable supported endpoint when one is available. Verify each selected endpoint with a successful sample and a boundary sample, map failures to explicit error codes/messages, and expose pagination when the endpoint supports it.

Do not submit posts, messages, purchases, or other consequential actions to a real account during validation without the user's explicit approval. Prefer a draft or test account where available.

### 3. Design the Command Tree

Use `commands` as the single command-definition container, with nested `capability` and `action` keys:

```yaml
commands:
  search:
    list:
      # one user-facing operation
```

Prefer capability groups such as `account`, `search`, `get`, and `user` when they accurately describe the site. Keep `search.*` focused on finding or filtering lists and `get.*` focused on a single entity's details. Do not expose an action unless its behavior and required parameters have evidence.

Command descriptions must be short English verb phrases describing user-visible behavior, such as `Search posts by keyword` or `Get post details`. Do not include internal workflow names or debugging notes.

### 4. Create the Plugin Files

Use this layout at the repository root:

```text
<site>/
├── manifest.yaml
├── workflows/
│   ├── account.yaml
│   ├── search.yaml
│   └── get.yaml
├── scripts/
│   ├── <site>.helpers.js
│   ├── <site>.site.js
│   └── <site>.bootstrap.js
└── tests/
    └── cases.test.yaml
```

Only add files that the plugin needs, but add regression cases for every new plugin. Keep workflow orchestration in YAML. Use scripts for reusable page-side parsing and handlers, not as a second workflow engine.

### 5. Follow the DSL v1 Rules

- Keep the command hierarchy nested as `commands.<capability>.<action>`. Do not define a parallel command tree.
- Use a named operation in each workflow file and set the matching `operation` value in the manifest. The operation name must exactly match a top-level key in that workflow file.
- Every workflow step must have one supported browser `action`; the other fields are that action's payload. Use only action names supported by the target runtime, preferring canonical names over aliases.
- Manifest workflow paths must be relative to the plugin folder, begin with `workflows/`, and end in `.yaml`.
- `shared_libs` entries must point to existing files under `scripts/`; list dependencies in load order.
- Declare input parameters in the manifest, not in workflow logic. Supported types are `string`, `number`, `boolean`, `array`, and `object`; defaults must have the declared type.
- Use `{{parameter}}` interpolation for workflow inputs. Keep parameter names consistent across the manifest, workflow, and script payload.
- Make `evaluate.script` a valid JavaScript expression; an IIFE is a clear default for multi-line scripts.
- Use real, verified wait conditions. Prefer a tested `waitforfunction` or `waitforurl` condition over waiting only for a generic document-ready state.
- Use workflow browser actions for navigation, input, upload, waiting, and other browser control. Keep page scripts focused on page-side parsing and helpers.
- Use `shared_libs`, `steps.include`, `routing`, or `aggregate` only when the requested design needs them and the target DSL supports them. `include` must expand into steps, `routing` selects a case using a declared field, and `aggregate` calls declared capability/action commands in sequence. Keep the ordinary single-site flow simple.

### 6. Implement Scripts and Results

Separate page-side responsibilities:

- A site script exposes reusable page parsing or request functions and returns structured data.
- A bootstrap script, when needed, registers handlers and forwards them to the site script; it should not contain workflow orchestration.
- Shared scripts must be listed in `manifest.yaml` and referenced by the workflow using the same global names they define.

Return explicit structured results. Successful handlers use `success: true` and `data`; failures use `success: false` and an `error` with a stable code and useful message. Do not turn an unknown state or a failed request into a success-shaped fallback.

Every site plugin must expose `account.health` with this platform-independent shape:

```json
{
  "success": true,
  "data": {
    "healthy": true,
    "account": {
      "id": "stable-platform-id",
      "nick": "display-name",
      "login": true
    }
  }
}
```

`healthy` and `account.login` are booleans. `account` contains only `id`, `nick`, and `login`. For a confirmed logged-out state, preserve the shape and return `healthy: false`, `id: null`, `nick: null`, and `login: false`. If the state cannot be determined because inspection failed, return an explicit error instead of reporting a confirmed logged-out state.

## Example

The following is a structural example, not a ready-made site implementation. Replace the example URL and `data-example-results` locator only after verifying the corresponding page and locator on the target site.

### `example_site/manifest.yaml`

```yaml
name: example_site
id: plugin.example_site
platform: example_site
version: "1.0.0"
description: "Example site plugin"

shared_libs:
  - scripts/example_site.site.js

commands:
  account:
    health:
      workflow: workflows/account.yaml
      operation: health
      description: "Check account health"
      params: []

  search:
    list:
      workflow: workflows/search.yaml
      operation: list
      description: "Search items by keyword"
      params:
        - name: keyword
          type: string
          required: true
        - name: page
          type: number
          required: false
          default: 1
        - name: limit
          type: number
          required: false
          default: 20
```

If the site requires login, add an `auth` block with verified login URLs and suitable timeouts. Do not add authentication metadata for a site that does not need it.

### `example_site/workflows/search.yaml`

```yaml
list:
  steps:
    - action: navigate
      url: "https://example.com/search?q={{keyword}}"

    - action: waitforfunction
      expression: "!!document.querySelector('[data-example-results]')"
      timeoutMs: 12000

    - action: evaluate
      script: |
        (function () {
          return window.__mediauseExampleSite.search({
            keyword: "{{keyword}}",
            page: Number("{{page}}") || 1,
            limit: Number("{{limit}}") || 20
          });
        })();
```

### `example_site/workflows/account.yaml`

```yaml
health:
  steps:
    - action: navigate
      url: "https://example.com"

    - action: waitforfunction
      expression: "!!document.querySelector('[data-example-app-root]')"
      timeoutMs: 12000

    - action: evaluate
      script: |
        (function () {
          return window.__mediauseExampleSite.accountHealth();
        })();
```

### `example_site/scripts/example_site.site.js`

```javascript
(function () {
  function accountHealth() {
    var accountElement = document.querySelector("[data-example-account]");
    if (!accountElement) {
      return {
        success: true,
        data: {
          healthy: false,
          account: {
            id: null,
            nick: null,
            login: false
          }
        }
      };
    }

    var accountId = accountElement.getAttribute("data-example-id");
    var username = accountElement.getAttribute("data-example-username");
    var nickname = accountElement.getAttribute("data-example-nick");

    if ((!accountId && !username) || (!nickname && !username)) {
      return {
        success: false,
        error: {
          code: "example_site.account_identity_unavailable",
          message: "Could not resolve the account identity from verified page data.",
          details: null
        }
      };
    }

    return {
      success: true,
      data: {
        healthy: true,
        account: {
          id: accountId || username,
          nick: nickname || username,
          login: true
        }
      }
    };
  }

  function search(payload) {
    var items = Array.from(
      document.querySelectorAll("[data-example-results] article")
    ).map(function (element) {
      return { text: element.textContent.trim() };
    });

    return {
      success: true,
      data: {
        items: items,
        page: Number(payload.page) || 1,
        limit: Number(payload.limit) || 20
      }
    };
  }

  window.__mediauseExampleSite = {
    accountHealth: accountHealth,
    search: search
  };
})();
```

The example demonstrates the required `account.health` shape and one search operation. Replace all example URLs and selectors with evidence from the target site; do not copy placeholder selectors as production locators.

### `example_site/tests/cases.test.yaml`

```yaml
- id: example_site_account_health
  description: "Example site exposes account health"
  capability: account
  action: health
  params: {}
  expect:
    success: true

- id: example_site_search_list
  description: "Example site exposes item search"
  capability: search
  action: list
  params:
    keyword: "sample"
    page: 1
    limit: 10
  expect:
    success: true
```

## Validation and Delivery

Before reporting completion:

1. Check that every manifest workflow and shared-script path exists and that each `operation` matches its workflow key.
2. Check YAML syntax, parameter types/defaults, command names, and workflow payloads.
3. Confirm that every browser action is supported by the target runtime and every important locator has been verified on the live page.
4. Add `tests/cases.test.yaml` cases for the declared command contract, including a boundary case where relevant.
5. If JavaScript tooling is available, run a syntax check such as `node --check <site>/scripts/<file>.js`. This checks syntax only; it does not verify browser behavior.
6. If a compatible runtime is available, run its plugin tests and smoke-test `account.health`, at least one implemented `search.*` command, and at least one implemented `get.*` command. If a capability is not applicable to the site, document why instead of inventing it.
7. This plugins-only repository has no standalone runtime or test runner. State which checks were actually run, and report unavailable checks as unverified.

Finish with a concise evidence summary: files changed, URLs visited, APIs and selectors tested, commands exercised and their key result fields, and known capability limits. Never report an unrun check as passing.
