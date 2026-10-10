(function () {
  var helpers = window.__mediauseSemrushHelpers || {};

  function normalizeString(value) {
    return helpers.normalizeString ? helpers.normalizeString(value) : String(value || '').replace(/\s+/g, ' ').trim();
  }

  function errorResult(code, message, details) {
    if (helpers.errorResult) {
      return helpers.errorResult(code, message, details);
    }
    return { success: false, error: { code: code, message: message, details: details || null } };
  }

  function successItems(items) {
    return helpers.successItems ? helpers.successItems(items) : { success: true, data: { items: items || [] } };
  }

  function successObject(data) {
    return helpers.successObject ? helpers.successObject(data) : { success: true, data: data || {} };
  }

  function readSm2User() {
    var sm2 = window.sm2;
    var user = sm2 && sm2.user;
    if (!user || typeof user !== 'object') {
      return null;
    }
    return user;
  }

  function isLoggedIn() {
    if (readSm2User()) {
      return true;
    }
    return !!document.querySelector('[role="menuitem"][aria-label="My profile"]');
  }

  function isLoginPage() {
    var text = normalizeString(document.body && document.body.innerText || '');
    return /create account|log in|register to get 10 free requests|enter your password/i.test(text);
  }

  function requireLogin(context) {
    if (isLoggedIn() && !isLoginPage()) {
      return null;
    }
    return errorResult('semrush.auth.login_required', context + ' requires a logged-in Semrush account', {
      url: window.location.href,
      title: document.title,
      suggestion: 'Run mediause auth login semrush and then mediause use account semrush:<account_id>'
    });
  }

  function extractDomainFromHeading(prefixPattern) {
    var heading = document.querySelector('h1');
    var text = normalizeString(heading && heading.textContent);
    if (!text) {
      return '';
    }

    if (prefixPattern && prefixPattern.test(text)) {
      return normalizeString(text.replace(prefixPattern, ''));
    }

    var parts = text.split(':');
    if (parts.length >= 2) {
      return normalizeString(parts.slice(1).join(':'));
    }

    return text;
  }

  function normalizeLabel(text) {
    return normalizeString(text || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function findMetricText(label) {
    var text = normalizeString(document.body && document.body.innerText || '');
    var escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var patterns = [
      new RegExp('(' + escaped + ')\\s+([\\d.,]+(?:\\s*[kKmMbB%])?)', 'i'),
      new RegExp('([\\d.,]+(?:\\s*[kKmMbB%])?)\\s+(' + escaped + ')', 'i')
    ];

    for (var i = 0; i < patterns.length; i += 1) {
      var match = text.match(patterns[i]);
      if (match) {
        return match[2] || match[1] || null;
      }
    }

    return null;
  }

  function parseMetricTokens(text) {
    var raw = normalizeString(text);
    if (!raw) {
      return [];
    }

    if (/^n\/a$/i.test(raw)) {
      return ['n/a'];
    }

    var matches = raw.match(/[+-]?\d[\d,.]*(?:\s*[kKmMbB])?%?|n\/a/ig);
    return matches || [];
  }

  function pickMetricToken(tokens) {
    if (!tokens || !tokens.length) {
      return null;
    }

    var cleaned = tokens
      .map(function (token) { return normalizeString(token); })
      .filter(function (token) { return !!token; });

    var nonPercent = cleaned.find(function (token) {
      return !/%$/.test(token) && /^n\/a$/i.test(token) === false;
    });
    if (nonPercent) {
      return nonPercent;
    }

    return cleaned[0] || null;
  }

  function getMetricFromScope(scope, targetLabel) {
    if (!scope) {
      return null;
    }

    var values = Array.prototype.slice.call(scope.querySelectorAll('a,button,span,div,p,li'))
      .map(function (node) { return normalizeString(node.textContent); })
      .filter(function (text) { return !!text; })
      .filter(function (text) {
        return normalizeLabel(text) !== targetLabel;
      });

    for (var i = 0; i < values.length; i += 1) {
      var token = pickMetricToken(parseMetricTokens(values[i]));
      if (token) {
        return token;
      }
    }

    return null;
  }

  function isTitleLikeNode(node) {
    if (!node || !node.getAttribute) {
      return false;
    }
    return node.hasAttribute('data-test-flag2-title') || node.hasAttribute('data-test-outbound-domains-title') || node.hasAttribute('data-test-toxic-score-title');
  }

  function buildMetricCandidate(value, score) {
    if (!value) {
      return null;
    }
    return {
      value: value,
      score: score
    };
  }

  function preferCandidate(best, candidate) {
    if (!candidate) {
      return best;
    }
    if (!best) {
      return candidate;
    }
    if (candidate.score > best.score) {
      return candidate;
    }
    return best;
  }

  function getMetricNearLabel(target, targetLabel) {
    var best = null;
    var directValueScope = target.closest('[data-test-flag2-item], [data-test-flag2-value]');
    if (directValueScope) {
      var directValue = getMetricFromScope(directValueScope.querySelector('[data-test-flag2-value]') || directValueScope, targetLabel);
      if (directValue) {
        var directScore = 100;
        if (isTitleLikeNode(target)) {
          directScore += 30;
        }
        best = preferCandidate(best, buildMetricCandidate(directValue, directScore));
      }
    }

    var current = target;
    for (var depth = 0; current && depth < 6; depth += 1) {
      var sibling = current.nextElementSibling;
      while (sibling) {
        var siblingValue = getMetricFromScope(sibling, targetLabel);
        if (siblingValue) {
          var siblingScore = 70 - depth * 10;
          best = preferCandidate(best, buildMetricCandidate(siblingValue, siblingScore));
        }
        sibling = sibling.nextElementSibling;
      }
      current = current.parentElement;
    }

    return best;
  }

  function getMetricByLabel(label) {
    var scope = document.querySelector('main') || document.body;
    var targetLabel = normalizeLabel(label);
    var nodes = Array.prototype.slice.call(scope.querySelectorAll('a,button,span,div,p,li'));

    var targets = nodes.filter(function (node) {
      var text = normalizeLabel(node.textContent);
      return text === targetLabel || text.indexOf(targetLabel) >= 0;
    });

    if (!targets.length) {
      return null;
    }

    // Prefer the most specific label node first to avoid container-level text collisions.
    targets.sort(function (a, b) {
      return normalizeString(a.textContent).length - normalizeString(b.textContent).length;
    });

    var best = null;
    for (var i = 0; i < targets.length; i += 1) {
      var metric = getMetricNearLabel(targets[i], targetLabel);
      best = preferCandidate(best, metric);
    }

    if (best && best.value) {
      return best.value;
    }

    return findMetricText(label) || null;
  }

  function normalizeNumber(value, fallbackValue) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed)) {
      return fallbackValue;
    }
    return parsed;
  }

  function parseDomainList(value) {
    if (Array.isArray(value)) {
      return value.map(function (item) { return normalizeString(item); }).filter(function (item) { return !!item; });
    }

    var raw = normalizeString(value);
    if (!raw) {
      return [];
    }

    if (raw.charAt(0) === '[' && raw.charAt(raw.length - 1) === ']') {
      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map(function (item) { return normalizeString(item); }).filter(function (item) { return !!item; });
        }
      } catch (error) {
        // Keep plain string split as fallback.
      }
    }

    return raw
      .split(/[\n,;|]/)
      .map(function (item) { return normalizeString(item); })
      .filter(function (item) { return !!item; });
  }

  function normalizeColumnKey(value) {
    var raw = normalizeString(value);
    if (!raw) {
      return '';
    }
    if (/^symbol\(.+\)$/i.test(raw)) {
      return '';
    }
    return raw
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/[^a-zA-Z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .toLowerCase();
  }

  function chooseRowKeyword(cells, row) {
    if (!Array.isArray(cells) || !cells.length) {
      return null;
    }

    var direct = row && row.querySelector && row.querySelector('[data-test-source-url], [data-test-target-url], [data-test-anchor]');
    var directText = normalizeString(direct && direct.textContent);
    if (directText) {
      return directText;
    }

    for (var i = 0; i < cells.length; i += 1) {
      var cell = normalizeString(cells[i]);
      if (cell && /\d/.test(cell) === false) {
        return cell;
      }
    }

    return cells[0] || null;
  }

  function parseGridRows(limit) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('[data-test-tbody-tr][role="row"], [data-ui-name="Body.Row"][role="row"]'));
    if (!rows.length) {
      return [];
    }

    var capped = Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows;
    return capped.map(function (row) {
      var cellNodes = Array.prototype.slice.call(row.querySelectorAll('[role="gridcell"], [data-ui-name="Row.Cell"]'));
      if (!cellNodes.length) {
        return null;
      }

      cellNodes.sort(function (a, b) {
        var aCol = Number(normalizeString(a.getAttribute && a.getAttribute('aria-colindex')));
        var bCol = Number(normalizeString(b.getAttribute && b.getAttribute('aria-colindex')));
        var left = Number.isFinite(aCol) ? aCol : 0;
        var right = Number.isFinite(bCol) ? bCol : 0;
        return left - right;
      });

      var cells = [];
      var columns = [];
      cellNodes.forEach(function (cellNode, index) {
        var key = normalizeColumnKey(cellNode.getAttribute && cellNode.getAttribute('name'));
        var text = normalizeString(cellNode.textContent);

        if (!text) {
          return;
        }
        if (key === 'select_all') {
          return;
        }

        cells.push(text);
        columns.push(key || ('col_' + index));
      });

      if (!cells.length) {
        return null;
      }

      return {
        keyword: chooseRowKeyword(cells, row),
        cells: cells,
        columns: columns,
        raw: normalizeString(row.textContent)
      };
    }).filter(function (row) { return !!row; });
  }

  function parseTableRows(limit) {
    var gridRows = parseGridRows(limit);
    if (gridRows.length) {
      return gridRows;
    }

    var rows = Array.prototype.slice.call(document.querySelectorAll('table tbody tr'));
    var capped = Number.isFinite(limit) && limit > 0 ? rows.slice(0, limit) : rows;

    return capped.map(function (row) {
      var cells = Array.prototype.slice.call(row.querySelectorAll('th,td'))
        .map(function (cell) { return normalizeString(cell.textContent); })
        .filter(function (text) { return !!text; });

      if (!cells.length) {
        return null;
      }

      return {
        keyword: cells[0] || null,
        cells: cells,
        columns: null,
        raw: normalizeString(row.textContent)
      };
    }).filter(function (row) { return !!row; });
  }

  function parseTableObjects(limit) {
    var headerNodes = Array.prototype.slice.call(document.querySelectorAll('table thead th'));
    var headers = headerNodes.map(function (header) {
      return normalizeLabel(header.textContent);
    });

    var rows = parseTableRows(limit);
    return rows.map(function (row) {
      var data = {};
      for (var i = 0; i < row.cells.length; i += 1) {
        var key = (row.columns && row.columns[i]) || headers[i] || ('col_' + i);
        data[key] = row.cells[i];
      }
      return {
        key: row.keyword,
        data: data,
        cells: row.cells,
        raw: row.raw
      };
    });
  }

  function extractUrlFromCells(cells) {
    if (!Array.isArray(cells)) {
      return null;
    }
    for (var i = 0; i < cells.length; i += 1) {
      var cell = normalizeString(cells[i]);
      if (/^https?:\/\//i.test(cell) || /^www\./i.test(cell) || /^\//.test(cell)) {
        return cell;
      }
    }
    return null;
  }

  function summarizeSeverity(items) {
    var summary = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      unknown: 0
    };

    items.forEach(function (item) {
      var text = normalizeLabel(item.raw || item.key || '');
      if (text.indexOf('critical') >= 0) {
        summary.critical += 1;
      } else if (text.indexOf('high') >= 0) {
        summary.high += 1;
      } else if (text.indexOf('medium') >= 0) {
        summary.medium += 1;
      } else if (text.indexOf('low') >= 0) {
        summary.low += 1;
      } else {
        summary.unknown += 1;
      }
    });

    return summary;
  }

  function findFirstMetricTokenInText(text) {
    var token = pickMetricToken(parseMetricTokens(text));
    return token || null;
  }

  function toOpportunityScore(volumeToken, difficultyToken) {
    var volume = helpers.normalizeMetric ? helpers.normalizeMetric(volumeToken) : null;
    var difficulty = helpers.normalizeMetric ? helpers.normalizeMetric(difficultyToken) : null;

    if (!Number.isFinite(volume) || volume <= 0) {
      return 0;
    }
    if (!Number.isFinite(difficulty) || difficulty <= 0) {
      return volume;
    }

    return Math.round((volume * 100) / difficulty);
  }

  async function accountHealth() {
    var user = readSm2User();
    if (!user) {
      return errorResult('semrush.auth.login_required', 'account.health requires a logged-in Semrush account', {
        url: window.location.href,
        title: document.title,
        suggestion: 'Run mediause auth login semrush and then mediause use account semrush:<account_id>'
      });
    }

    var id = normalizeString(user.id);
    var email = normalizeString(user.email);
    var shortName = normalizeString(user.short_name);
    var nick = shortName || email || id || 'Semrush User';

    return successObject({
      healthy: true,
      account: {
        id: id || email || nick,
        nick: nick,
        login: true
      }
    });
  }

  async function searchDomain(payload) {
    var blocked = requireLogin('search.domain');
    if (blocked) {
      return blocked;
    }

    var query = normalizeString(payload && payload.query);
    if (!query) {
      return errorResult('semrush.search.domain.query_required', 'query is required');
    }

    var heading = normalizeString((document.querySelector('h1') || {}).textContent || '');
    var title = normalizeString(document.title);

    return successItems([{
      query: query,
      title: title,
      heading: heading,
      url: window.location.href
    }]);
  }

  async function getOverview(payload) {
    var blocked = requireLogin('get.overview');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain) || extractDomainFromHeading(/^Domain Overview\s*:/i);
    var authorityScore = getMetricByLabel('Authority Score');
    var organicSearchTraffic = getMetricByLabel('Organic Search Traffic');
    var backlinks = getMetricByLabel('Backlinks');

    return successItems([{
      domain: domain,
      authority_score: helpers.normalizeMetric ? helpers.normalizeMetric(authorityScore) : null,
      organic_search_traffic: helpers.normalizeMetric ? helpers.normalizeMetric(organicSearchTraffic) : null,
      backlinks: helpers.normalizeMetric ? helpers.normalizeMetric(backlinks) : null,
      url: window.location.href
    }]);
  }

  async function getBacklinks(payload) {
    var blocked = requireLogin('get.backlinks');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain) || extractDomainFromHeading(/^Backlinks\s*:/i);
    var referringDomains = getMetricByLabel('Referring Domains');
    var backlinks = getMetricByLabel('Backlinks');
    var monthlyVisits = getMetricByLabel('Monthly Visits');
    var outboundDomains = getMetricByLabel('Outbound Domains');
    var organicTraffic = getMetricByLabel('Organic Traffic');

    return successItems([{
      domain: domain,
      referring_domains: helpers.normalizeMetric ? helpers.normalizeMetric(referringDomains) : null,
      backlinks: helpers.normalizeMetric ? helpers.normalizeMetric(backlinks) : null,
      monthly_visits: helpers.normalizeMetric ? helpers.normalizeMetric(monthlyVisits) : null,
      outbound_domains: helpers.normalizeMetric ? helpers.normalizeMetric(outboundDomains) : null,
      organic_traffic: helpers.normalizeMetric ? helpers.normalizeMetric(organicTraffic) : null,
      url: window.location.href
    }]);
  }

  async function getBacklinksDomains(payload) {
    var blocked = requireLogin('get.backlinks_domains');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var limit = normalizeNumber(payload && payload.limit, 100);
    var rows = parseTableObjects(limit);

    var items = rows.map(function (row) {
      return {
        domain: domain,
        ref_domain: row.key,
        authority_score: helpers.normalizeMetric ? helpers.normalizeMetric(findFirstMetricTokenInText(row.raw)) : null,
        cells: row.cells,
        url: window.location.href
      };
    });

    return successObject({ domain: domain, count: items.length, items: items, url: window.location.href });
  }

  async function getBacklinksDetail(payload) {
    var blocked = requireLogin('get.backlinks_detail');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var limit = normalizeNumber(payload && payload.limit, 100);
    var rows = parseTableObjects(limit);

    var items = rows.map(function (row) {
      return {
        domain: domain,
        source_url: extractUrlFromCells(row.cells),
        anchor: row.key,
        follow: /follow/i.test(row.raw),
        cells: row.cells,
        url: window.location.href
      };
    });

    return successObject({ domain: domain, count: items.length, items: items, url: window.location.href });
  }

  async function getBacklinksNewLost(payload) {
    var blocked = requireLogin('get.backlinks_new_lost');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var limit = normalizeNumber(payload && payload.limit, 100);
    var rows = parseTableObjects(limit);

    var items = rows.map(function (row) {
      var normalized = normalizeLabel(row.raw);
      var status = 'unknown';
      if (normalized.indexOf('new') >= 0) {
        status = 'new';
      }
      if (normalized.indexOf('lost') >= 0) {
        status = 'lost';
      }

      return {
        domain: domain,
        backlink: extractUrlFromCells(row.cells),
        status: status,
        cells: row.cells,
        url: window.location.href
      };
    });

    return successObject({ domain: domain, count: items.length, items: items, url: window.location.href });
  }

  async function getBacklinksAnchors(payload) {
    var blocked = requireLogin('get.backlinks_anchors');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var limit = normalizeNumber(payload && payload.limit, 100);
    var rows = parseTableObjects(limit);

    var items = rows.map(function (row) {
      return {
        domain: domain,
        anchor: row.key,
        backlinks: helpers.normalizeMetric ? helpers.normalizeMetric(findFirstMetricTokenInText(row.raw)) : null,
        cells: row.cells,
        url: window.location.href
      };
    });

    return successObject({ domain: domain, count: items.length, items: items, url: window.location.href });
  }

  async function getOrganic(payload) {
    var blocked = requireLogin('get.organic');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain) || extractDomainFromHeading(/^Organic Rankings\s*:/i);
    var title = normalizeString(document.title);
    var noData = !!document.querySelector('h3') && /couldn\'t find any data/i.test(normalizeString((document.querySelector('h3') || {}).textContent));

    return successItems([{
      domain: domain,
      db: normalizeString(payload && payload.db) || 'us',
      title: title,
      has_data: !noData,
      url: window.location.href
    }]);
  }

  async function getOrganicPages(payload) {
    var blocked = requireLogin('get.organic_pages');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var db = normalizeString(payload && payload.db) || 'us';
    var limit = normalizeNumber(payload && payload.limit, 100);
    var rows = parseTableObjects(limit);

    var items = rows.map(function (row) {
      return {
        domain: domain,
        db: db,
        url_path: extractUrlFromCells(row.cells) || row.key,
        traffic_contribution: helpers.normalizeMetric ? helpers.normalizeMetric(findFirstMetricTokenInText(row.raw)) : null,
        cells: row.cells,
        source_url: window.location.href
      };
    });

    return successObject({ domain: domain, db: db, count: items.length, items: items, url: window.location.href });
  }

  async function getPositionsList(payload) {
    var blocked = requireLogin('get.positions_list');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var db = normalizeString(payload && payload.db) || 'us';
    var limit = normalizeNumber(payload && payload.limit, 100);
    var rows = parseTableObjects(limit);

    var items = rows.map(function (row) {
      var positionToken = findFirstMetricTokenInText(row.raw);
      return {
        domain: domain,
        db: db,
        keyword: row.key,
        position: helpers.normalizeMetric ? helpers.normalizeMetric(positionToken) : null,
        url_path: extractUrlFromCells(row.cells),
        traffic_contribution: helpers.normalizeMetric ? helpers.normalizeMetric(findFirstMetricTokenInText(row.cells.join(' '))) : null,
        cells: row.cells,
        source_url: window.location.href
      };
    });

    return successObject({ domain: domain, db: db, count: items.length, items: items, url: window.location.href });
  }

  async function getKeyword(payload) {
    var blocked = requireLogin('get.keyword');
    if (blocked) {
      return blocked;
    }

    var keyword = normalizeString(payload && payload.keyword) || extractDomainFromHeading(/^Keyword Overview\s*:/i);
    var searchVolume = getMetricByLabel('Search Volume');
    var keywordDifficulty = getMetricByLabel('Keyword Difficulty');

    return successItems([{
      keyword: keyword,
      search_volume: helpers.normalizeMetric ? helpers.normalizeMetric(searchVolume) : null,
      keyword_difficulty: helpers.normalizeMetric ? helpers.normalizeMetric(keywordDifficulty) : null,
      url: window.location.href
    }]);
  }

  async function getPositions(payload) {
    var blocked = requireLogin('get.positions');
    if (blocked) {
      return blocked;
    }

    var keyword = normalizeString(payload && payload.keyword) || extractDomainFromHeading(/^Positions\s*:/i);
    var position = getMetricByLabel('Position');

    return successItems([{
      keyword: keyword,
      position: helpers.normalizeMetric ? helpers.normalizeMetric(position) : null,
      url: window.location.href
    }]);
  }

  async function getCompetitors(payload) {
    var blocked = requireLogin('get.competitors');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain) || extractDomainFromHeading(/^Competitors\s*:/i);
    var commonKeywords = getMetricByLabel('Common Keywords');

    return successItems([{
      domain: domain,
      common_keywords: helpers.normalizeMetric ? helpers.normalizeMetric(commonKeywords) : null,
      url: window.location.href
    }]);
  }

  async function getProject(payload) {
    var blocked = requireLogin('get.project');
    if (blocked) {
      return blocked;
    }

    var project = normalizeString(payload && payload.project) || extractDomainFromHeading(/^Project\s*:/i);

    return successItems([{
      project: project,
      url: window.location.href
    }]);
  }

  async function getKeywordGap(payload) {
    var blocked = requireLogin('seo.keyword_gap');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    if (!domain) {
      return errorResult('semrush.seo.keyword_gap.domain_required', 'domain is required');
    }

    var targets = parseDomainList(payload && payload.targets);
    var limit = normalizeNumber(payload && payload.limit, 50);
    var rows = parseTableRows(limit * 3);

    var items = rows.map(function (row) {
      var volumeToken = row.cells.find(function (cell) {
        var normalized = normalizeLabel(cell);
        return normalized.indexOf('k') >= 0 || normalized.indexOf('m') >= 0 || /^\d[\d,.]*$/.test(cell);
      }) || null;

      var difficultyToken = row.cells.find(function (cell) {
        return /%$/.test(cell) || /difficulty/i.test(cell);
      }) || null;

      return {
        domain: domain,
        targets: targets,
        keyword: row.keyword,
        volume: helpers.normalizeMetric ? helpers.normalizeMetric(volumeToken) : null,
        keyword_difficulty: helpers.normalizeMetric ? helpers.normalizeMetric(difficultyToken) : null,
        opportunity_score: toOpportunityScore(volumeToken, difficultyToken),
        cells: row.cells,
        url: window.location.href
      };
    }).slice(0, limit);

    return successObject({
      domain: domain,
      targets: targets,
      count: items.length,
      items: items,
      url: window.location.href
    });
  }

  async function getBacklinkGap(payload) {
    var blocked = requireLogin('seo.backlink_gap');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    if (!domain) {
      return errorResult('semrush.seo.backlink_gap.domain_required', 'domain is required');
    }

    var targets = parseDomainList(payload && payload.targets);
    var limit = normalizeNumber(payload && payload.limit, 50);
    var rows = parseTableRows(limit * 3);

    var items = rows.map(function (row) {
      var authorityToken = row.cells.find(function (cell) {
        return /^\d[\d,.]*$/.test(cell);
      }) || null;

      var backlinksToken = row.cells.find(function (cell) {
        return /[kmb]/i.test(cell) || /^\d[\d,.]*$/.test(cell);
      }) || null;

      return {
        domain: domain,
        targets: targets,
        ref_domain: row.keyword,
        authority_score: helpers.normalizeMetric ? helpers.normalizeMetric(authorityToken) : null,
        backlinks: helpers.normalizeMetric ? helpers.normalizeMetric(backlinksToken) : null,
        opportunity_score: helpers.normalizeMetric ? helpers.normalizeMetric(backlinksToken) : 0,
        cells: row.cells,
        url: window.location.href
      };
    }).slice(0, limit);

    return successObject({
      domain: domain,
      targets: targets,
      count: items.length,
      items: items,
      url: window.location.href
    });
  }

  async function getQuickWins(payload) {
    var blocked = requireLogin('seo.quick_wins');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    if (!domain) {
      return errorResult('semrush.seo.quick_wins.domain_required', 'domain is required');
    }

    var limit = normalizeNumber(payload && payload.limit, 30);
    var minPosition = normalizeNumber(payload && payload.min_position, 4);
    var maxPosition = normalizeNumber(payload && payload.max_position, 20);
    var rows = parseTableRows(limit * 6);

    var items = rows.map(function (row) {
      var positionToken = row.cells.find(function (cell) {
        return /^\d+$/.test(cell);
      }) || null;
      var volumeToken = row.cells.find(function (cell) {
        return /[kmb]/i.test(cell) || /^\d[\d,.]*$/.test(cell);
      }) || null;

      var position = helpers.normalizeMetric ? helpers.normalizeMetric(positionToken) : null;
      var volume = helpers.normalizeMetric ? helpers.normalizeMetric(volumeToken) : null;
      if (!Number.isFinite(position) || position < minPosition || position > maxPosition) {
        return null;
      }

      return {
        domain: domain,
        keyword: row.keyword,
        position: position,
        search_volume: volume,
        opportunity_score: Number.isFinite(volume) ? Math.max(1, Math.round(volume / Math.max(1, position))) : 0,
        cells: row.cells,
        url: window.location.href
      };
    }).filter(function (item) { return !!item; })
      .sort(function (a, b) { return b.opportunity_score - a.opportunity_score; })
      .slice(0, limit);

    return successObject({
      domain: domain,
      count: items.length,
      items: items,
      url: window.location.href
    });
  }

  async function getPositionDistribution(payload) {
    var blocked = requireLogin('seo.position_distribution');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var db = normalizeString(payload && payload.db) || 'us';
    var rows = parseTableRows(300);
    var buckets = { top3: 0, top10: 0, top20: 0, top100: 0, beyond100: 0 };

    rows.forEach(function (row) {
      var token = row.cells.find(function (cell) { return /^\d+$/.test(cell); });
      var position = helpers.normalizeMetric ? helpers.normalizeMetric(token) : null;
      if (!Number.isFinite(position)) {
        return;
      }
      if (position <= 3) {
        buckets.top3 += 1;
      } else if (position <= 10) {
        buckets.top10 += 1;
      } else if (position <= 20) {
        buckets.top20 += 1;
      } else if (position <= 100) {
        buckets.top100 += 1;
      } else {
        buckets.beyond100 += 1;
      }
    });

    return successObject({ domain: domain, db: db, buckets: buckets, url: window.location.href });
  }

  async function getSerpFeaturesCoverage(payload) {
    var blocked = requireLogin('seo.serp_features_coverage');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var db = normalizeString(payload && payload.db) || 'us';
    var rows = parseTableObjects(100);
    var items = rows.map(function (row) {
      return {
        domain: domain,
        feature: row.key,
        coverage: helpers.normalizeMetric ? helpers.normalizeMetric(findFirstMetricTokenInText(row.raw)) : null,
        cells: row.cells,
        url: window.location.href
      };
    });

    return successObject({ domain: domain, db: db, count: items.length, items: items, url: window.location.href });
  }

  async function getSiteAuditOverview(payload) {
    var blocked = requireLogin('seo.site_audit_overview');
    if (blocked) {
      return blocked;
    }

    var project = normalizeString(payload && payload.project);
    var rows = parseTableObjects(200);
    var severity = summarizeSeverity(rows);

    return successObject({ project: project, severity: severity, issues_detected: rows.length, url: window.location.href });
  }

  async function getSiteAuditIssues(payload) {
    var blocked = requireLogin('seo.site_audit_issues');
    if (blocked) {
      return blocked;
    }

    var project = normalizeString(payload && payload.project);
    var limit = normalizeNumber(payload && payload.limit, 100);
    var rows = parseTableObjects(limit);
    var items = rows.map(function (row) {
      return {
        project: project,
        issue: row.key,
        severity: normalizeLabel(row.raw).indexOf('critical') >= 0 ? 'critical'
          : normalizeLabel(row.raw).indexOf('high') >= 0 ? 'high'
            : normalizeLabel(row.raw).indexOf('medium') >= 0 ? 'medium'
              : normalizeLabel(row.raw).indexOf('low') >= 0 ? 'low' : 'unknown',
        affected: helpers.normalizeMetric ? helpers.normalizeMetric(findFirstMetricTokenInText(row.raw)) : null,
        cells: row.cells,
        url: window.location.href
      };
    });

    return successObject({ project: project, count: items.length, items: items, severity: summarizeSeverity(rows), url: window.location.href });
  }

  async function getProjectPositionTracking(payload) {
    var blocked = requireLogin('seo.project_position_tracking');
    if (blocked) {
      return blocked;
    }

    var project = normalizeString(payload && payload.project);
    var visibility = helpers.normalizeMetric ? helpers.normalizeMetric(getMetricByLabel('Visibility')) : null;
    var averagePosition = helpers.normalizeMetric ? helpers.normalizeMetric(getMetricByLabel('Average Position')) : null;
    var share = helpers.normalizeMetric ? helpers.normalizeMetric(getMetricByLabel('Share of Voice')) : null;

    return successObject({
      project: project,
      visibility: visibility,
      average_position: averagePosition,
      share_of_voice: share,
      url: window.location.href
    });
  }

  async function getContentRecommendations(payload) {
    var blocked = requireLogin('seo.content_recommendations');
    if (blocked) {
      return blocked;
    }

    var domain = normalizeString(payload && payload.domain);
    var limit = normalizeNumber(payload && payload.limit, 50);
    var rows = parseTableObjects(limit);

    var items = rows.map(function (row) {
      var urlPath = extractUrlFromCells(row.cells) || row.key;
      var topic = row.key;
      return {
        domain: domain,
        url_path: urlPath,
        topic: topic,
        title_suggestion: 'Optimize title intent for ' + topic,
        semantic_suggestion: 'Expand semantic coverage around ' + topic,
        internal_link_suggestion: 'Add 3-5 internal links to ' + urlPath,
        cells: row.cells,
        url: window.location.href
      };
    });

    return successObject({ domain: domain, count: items.length, items: items, url: window.location.href });
  }

  window.__mediauseSemrush = {
    accountHealth: accountHealth,
    searchDomain: searchDomain,
    getOverview: getOverview,
    getBacklinks: getBacklinks,
    getBacklinksDomains: getBacklinksDomains,
    getBacklinksDetail: getBacklinksDetail,
    getBacklinksNewLost: getBacklinksNewLost,
    getBacklinksAnchors: getBacklinksAnchors,
    getOrganic: getOrganic,
    getOrganicPages: getOrganicPages,
    getKeyword: getKeyword,
    getPositions: getPositions,
    getPositionsList: getPositionsList,
    getCompetitors: getCompetitors,
    getProject: getProject,
    getKeywordGap: getKeywordGap,
    getBacklinkGap: getBacklinkGap,
    getQuickWins: getQuickWins,
    getPositionDistribution: getPositionDistribution,
    getSerpFeaturesCoverage: getSerpFeaturesCoverage,
    getSiteAuditOverview: getSiteAuditOverview,
    getSiteAuditIssues: getSiteAuditIssues,
    getProjectPositionTracking: getProjectPositionTracking,
    getContentRecommendations: getContentRecommendations
  };
})();
