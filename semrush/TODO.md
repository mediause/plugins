# Semrush SEO Command Roadmap

## P0

- [x] `seo.keyword_gap` supports source-vs-multi-competitor comparison
  - Inputs: `domain`, `targets[]`, `db`, `limit`
  - Current: command surface + runtime parser + structured rows are implemented
  - Next: improve missing/overlap classification precision using explicit Semrush columns

- [x] Backlinks command family is exposed
  - Commands: `get.backlinks_domains`, `get.backlinks_detail`, `get.backlinks_new_lost`, `get.backlinks_anchors`
  - Current: command surface + runtime table extraction are implemented
  - Next: improve domain authority/follow/new-lost field mapping accuracy

- [x] Organic list command family is exposed
  - Commands: `get.organic_pages`, `get.positions_list`
  - Current: URL/keyword/position/traffic-contribution shape is implemented
  - Next: refine URL and traffic contribution extraction by named columns

- [x] Stable multi-target parser in site runtime
  - Supports array payloads, JSON array strings, and comma/newline-separated strings

## P1

- [x] `seo.position_distribution` command is exposed
  - Current: returns position buckets from positions table
  - Next: align buckets with Semrush official distribution definitions

- [x] `seo.serp_features_coverage` command is exposed
  - Current: returns table-based feature coverage items
  - Next: map feature names and coverage metrics by fixed columns

- [x] `seo.site_audit_overview` and `seo.site_audit_issues` commands are exposed
  - Current: severity aggregation and issues list are implemented
  - Next: link to true Site Audit project pages and structured issue IDs

- [x] `seo.project_position_tracking` command is exposed
  - Current: visibility/average position/share labels are parsed
  - Next: add trend deltas and date range support

## P2

- [x] `seo.content_recommendations` interface is exposed
  - Current: page-level title/semantic/internal-link suggestions are generated
  - Next: enrich recommendations with intent, entities, and competitor evidence
