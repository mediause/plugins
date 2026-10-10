(function () {
  var helpers = window.__mediauseFifa2026Helpers || {};

  function errorResult(code, message, details) {
    if (typeof helpers.errorResult === 'function') {
      return helpers.errorResult(code, message, details);
    }
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  function successData(data) {
    if (typeof helpers.successData === 'function') {
      return helpers.successData(data);
    }
    return { success: true, data: data };
  }

  function asString(value) {
    if (typeof helpers.asString === 'function') {
      return helpers.asString(value);
    }
    return String(value || '').trim();
  }

  function normalizeLimit(value, defaultValue, maxValue) {
    if (typeof helpers.normalizeLimit === 'function') {
      return helpers.normalizeLimit(value, defaultValue, maxValue);
    }
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      return defaultValue;
    }
    var intValue = Math.floor(n);
    return intValue > maxValue ? maxValue : intValue;
  }

  function normalizeBoolean(value, defaultValue) {
    if (typeof value === 'boolean') {
      return value;
    }

    var v = asString(value).toLowerCase();
    if (!v) {
      return !!defaultValue;
    }

    if (v === 'true' || v === '1' || v === 'yes' || v === 'y') {
      return true;
    }

    if (v === 'false' || v === '0' || v === 'no' || v === 'n') {
      return false;
    }

    return !!defaultValue;
  }

  function toAbsoluteUrl(href) {
    if (typeof helpers.toAbsoluteUrl === 'function') {
      return helpers.toAbsoluteUrl(href);
    }
    var v = asString(href);
    if (!v) {
      return '';
    }
    if (/^https?:\/\//i.test(v)) {
      return v;
    }
    if (v.charAt(0) === '/') {
      return 'https://fbref.com' + v;
    }
    return 'https://fbref.com/' + v;
  }

  function playerIdFromUrl(url) {
    if (typeof helpers.playerIdFromUrl === 'function') {
      return helpers.playerIdFromUrl(url);
    }
    var v = asString(url);
    var match = v.match(/\/players\/([^\/]+)\//i);
    return match ? match[1] : '';
  }

  function readCell(row, dataStat) {
    if (typeof helpers.readCell === 'function') {
      return helpers.readCell(row, dataStat);
    }
    var el = row.querySelector("td[data-stat='" + dataStat + "']");
    return asString(el ? el.textContent : '');
  }

  function readRowCell(row, dataStat) {
    if (!row) {
      return '';
    }

    return readCell(row, dataStat);
  }

  function resolvePlayerUrl(payload) {
    var url = asString(payload && payload.url);
    if (url) {
      return toAbsoluteUrl(url);
    }

    var id = asString(payload && payload.id);
    if (id) {
      return 'https://fbref.com/en/players/' + encodeURIComponent(id) + '/';
    }

    return asString(window.location.href);
  }

  function resolveTeamUrl(payload) {
    var url = asString(payload && payload.url);
    if (url) {
      return toAbsoluteUrl(url);
    }

    return asString(window.location.href);
  }

  function pickRows(selectors, root) {
    var scope = root || document;
    for (var i = 0; i < selectors.length; i += 1) {
      var rows = scope.querySelectorAll(selectors[i]);
      if (rows && rows.length) {
        return rows;
      }
    }
    return [];
  }

  function parseSearchRows(limit) {
    var cards = document.querySelectorAll('#players .search-item');
    if (cards && cards.length) {
      var cardItems = [];

      for (var c = 0; c < cards.length; c += 1) {
        if (cardItems.length >= limit) {
          break;
        }

        var card = cards[c];
        var nameAnchor = card.querySelector('.search-item-name a[href^="/en/players/"]');
        if (!nameAnchor) {
          continue;
        }

        var name = asString(nameAnchor.textContent);
        var playerUrl = toAbsoluteUrl(asString(nameAnchor.getAttribute('href')));
        if (!name || !playerUrl) {
          continue;
        }

        var nameLine = asString((card.querySelector('.search-item-name') || {}).textContent);
        var metaSegments = nameLine.split('·').map(function (segment) {
          return asString(segment);
        }).filter(function (segment) {
          return !!segment;
        });

        var years = '';
        var nation = '';
        for (var m = 0; m < metaSegments.length; m += 1) {
          var seg = metaSegments[m];
          if (!years && /\d{4}\s*-\s*\d{4}/.test(seg)) {
            years = seg;
            continue;
          }
          if (!nation && /^[A-Z]{2,3}$/.test(seg)) {
            nation = seg;
          }
        }

        var clubsText = asString((card.querySelector('.search-item-team') || {}).textContent);
        if (clubsText.indexOf('Clubs:') === 0) {
          clubsText = asString(clubsText.slice(6));
        }

        cardItems.push({
          id: playerIdFromUrl(playerUrl),
          name: name,
          url: playerUrl,
          nation: nation,
          position: '',
          squad: clubsText,
          competition: years
        });
      }

      if (cardItems.length) {
        return cardItems;
      }
    }

    var rows = pickRows([
      "table.stats_table tbody tr",
      "table tbody tr"
    ]);

    var items = [];
    for (var i = 0; i < rows.length; i += 1) {
      if (items.length >= limit) {
        break;
      }

      var row = rows[i];
      if (!row || row.classList.contains('thead')) {
        continue;
      }

      var playerAnchor = row.querySelector("th[data-stat='player'] a") || row.querySelector("td[data-stat='player'] a") || row.querySelector('a[href*="/players/"]');
      var name = asString(playerAnchor ? playerAnchor.textContent : '');
      var href = asString(playerAnchor ? playerAnchor.getAttribute('href') : '');
      var playerUrl = toAbsoluteUrl(href);
      if (!name || !playerUrl) {
        continue;
      }

      items.push({
        id: playerIdFromUrl(playerUrl),
        name: name,
        url: playerUrl,
        nation: readCell(row, 'nationality') || readCell(row, 'nation'),
        position: readCell(row, 'position') || readCell(row, 'pos'),
        squad: readCell(row, 'squad') || readCell(row, 'team'),
        competition: readCell(row, 'comp') || readCell(row, 'league_name')
      });
    }

    return items;
  }

  function parseSearchAnchors(limit) {
    var anchors = document.querySelectorAll('a[href*="/en/players/"]');
    var seen = {};
    var items = [];

    for (var i = 0; i < anchors.length; i += 1) {
      if (items.length >= limit) {
        break;
      }

      var anchor = anchors[i];
      var href = asString(anchor ? anchor.getAttribute('href') : '');
      var url = toAbsoluteUrl(href);
      var id = playerIdFromUrl(url);
      var name = asString(anchor ? anchor.textContent : '');

      if (!id || !name || seen[id]) {
        continue;
      }

      seen[id] = true;
      items.push({
        id: id,
        name: name,
        url: url,
        nation: '',
        position: '',
        squad: '',
        competition: ''
      });
    }

    return items;
  }

  function parseCompetitionGroups(limit, root) {
    var tableSelectors = [
      "table.stats_table",
      "table[id*='results']",
      "table[id*='standings']",
      "table"
    ];

    var scope = root || document;
    var tables = pickRows(tableSelectors, scope);
    var prioritizedTables = [];
    var fallbackTables = [];

    for (var p = 0; p < tables.length; p += 1) {
      var candidate = tables[p];
      if (!candidate || candidate.tagName !== 'TABLE') {
        continue;
      }

      var links = candidate.querySelectorAll("a[href*='/en/squads/']");
      if (!links.length) {
        continue;
      }

      var cap = asString((candidate.querySelector('caption') || {}).textContent);
      var prevHeading = '';
      var prevNode = candidate.previousElementSibling;
      while (prevNode) {
        if (/^H[2-4]$/.test(prevNode.tagName)) {
          prevHeading = asString(prevNode.textContent);
          break;
        }
        prevNode = prevNode.previousElementSibling;
      }

      var key = (cap + ' ' + prevHeading).toLowerCase();
      if (/\bgroup\s+[a-z0-9]+\b/.test(key)) {
        prioritizedTables.push(candidate);
      } else {
        fallbackTables.push(candidate);
      }
    }

    tables = prioritizedTables.length ? prioritizedTables : fallbackTables;
    var groups = [];
    var teams = [];
    var seenTeam = {};

    for (var t = 0; t < tables.length; t += 1) {
      var table = tables[t];

      var caption = asString((table.querySelector('caption') || {}).textContent);
      var heading = '';
      var prev = table.previousElementSibling;
      while (prev) {
        if (/^H[2-4]$/.test(prev.tagName)) {
          heading = asString(prev.textContent);
          break;
        }
        prev = prev.previousElementSibling;
      }

      var groupName = caption || heading || ('Group ' + String(groups.length + 1));
      var groupTeams = [];

      var rows = table.querySelectorAll('tbody tr');
      for (var r = 0; r < rows.length; r += 1) {
        if (teams.length >= limit) {
          break;
        }

        var row = rows[r];
        if (!row || row.classList.contains('thead')) {
          continue;
        }

        var teamAnchor = row.querySelector("th[data-stat='team'] a")
          || row.querySelector("td[data-stat='squad'] a")
          || row.querySelector("a[href*='/en/squads/']");

        if (!teamAnchor) {
          continue;
        }

        var teamName = asString(teamAnchor.textContent);
        var teamUrl = toAbsoluteUrl(asString(teamAnchor.getAttribute('href')));
        if (!teamName || !teamUrl || seenTeam[teamUrl]) {
          continue;
        }

        seenTeam[teamUrl] = true;
        var teamEntry = {
          group: groupName,
          name: teamName,
          url: teamUrl,
          rank: readCell(row, 'rank') || readCell(row, 'ranker') || '',
          matches: readCell(row, 'games') || readCell(row, 'matches') || '',
          wins: readCell(row, 'wins') || '',
          draws: readCell(row, 'ties') || readCell(row, 'draws') || '',
          losses: readCell(row, 'losses') || '',
          goals_for: readCell(row, 'goals_for') || readCell(row, 'goals') || '',
          goals_against: readCell(row, 'goals_against') || '',
          goal_diff: readCell(row, 'goal_diff') || '',
          points: readCell(row, 'points') || ''
        };

        groupTeams.push({
          name: teamEntry.name,
          url: teamEntry.url,
          points: teamEntry.points
        });
        teams.push(teamEntry);
      }

      if (groupTeams.length) {
        groups.push({
          name: groupName,
          teams: groupTeams
        });
      }
    }

    return {
      groups: groups,
      teams: teams
    };
  }

  function parseTeamPlayersFromDocument(doc, playerLimit) {
    var tables = doc.querySelectorAll("table[id*='stats_standard'] tbody tr, table.stats_table tbody tr");
    var players = [];
    var seen = {};

    for (var i = 0; i < tables.length; i += 1) {
      if (players.length >= playerLimit) {
        break;
      }

      var row = tables[i];
      if (!row || row.classList.contains('thead')) {
        continue;
      }

      var anchor = row.querySelector("th[data-stat='player'] a")
        || row.querySelector("td[data-stat='player'] a")
        || row.querySelector("a[href*='/en/players/']");

      if (!anchor) {
        continue;
      }

      var playerName = asString(anchor.textContent);
      var playerUrl = toAbsoluteUrl(asString(anchor.getAttribute('href')));
      var key = playerUrl || playerName;
      if (!playerName || !playerUrl || seen[key]) {
        continue;
      }

      seen[key] = true;
      players.push({
        id: playerIdFromUrl(playerUrl),
        name: playerName,
        url: playerUrl,
        nation: readCell(row, 'nationality') || readCell(row, 'nation') || '',
        position: readCell(row, 'position') || readCell(row, 'pos') || '',
        age: readCell(row, 'age') || '',
        minutes: readCell(row, 'minutes') || readCell(row, 'min') || '',
        goals: readCell(row, 'goals') || readCell(row, 'gls') || '',
        assists: readCell(row, 'assists') || readCell(row, 'ast') || ''
      });
    }

    return players;
  }

  async function fetchTeamPlayers(teamUrl, playerLimit) {
    var absoluteUrl = toAbsoluteUrl(teamUrl);
    var response = await fetch(absoluteUrl, { credentials: 'include' });
    if (!response.ok) {
      return {
        success: false,
        error: 'HTTP ' + String(response.status)
      };
    }

    var html = await response.text();
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');

    return {
      success: true,
      players: parseTeamPlayersFromDocument(doc, playerLimit)
    };
  }

  function parseTeamMatchRows(limit, root) {
    var rows = pickRows([
      "table[id*='scores'] tbody tr",
      "table[id*='schedule'] tbody tr",
      "table[id*='matchlogs'] tbody tr",
      "table.stats_table tbody tr"
    ], root || document);

    var items = [];
    for (var i = 0; i < rows.length; i += 1) {
      if (items.length >= limit) {
        break;
      }

      var row = rows[i];
      if (!row || row.classList.contains('thead')) {
        continue;
      }

      var dateCell = row.querySelector("th[data-stat='date']") || row.querySelector("td[data-stat='date']");
      var date = asString(dateCell ? dateCell.textContent : '');
      var opponent = readCell(row, 'opponent') || readCell(row, 'opponent_team') || readCell(row, 'opponent_club');
      var result = readCell(row, 'result') || readCell(row, 'score');

      if (!date && !opponent && !result) {
        continue;
      }

      items.push({
        date: date,
        competition: readCell(row, 'comp') || readCell(row, 'league_name'),
        round: readCell(row, 'round') || readCell(row, 'round_of'),
        venue: readCell(row, 'venue'),
        opponent: opponent,
        result: result,
        goals_for: readCell(row, 'goals_for') || readCell(row, 'gf') || '',
        goals_against: readCell(row, 'goals_against') || readCell(row, 'ga') || '',
        xg_for: readCell(row, 'xg_for') || readCell(row, 'xg') || '',
        xg_against: readCell(row, 'xg_against') || ''
      });
    }

    return items;
  }

  function parseMetaParagraphs(root) {
    var scope = root || document;
    var metaRoot = scope.querySelector('#meta') || scope.querySelector('div#meta') || scope.querySelector('main');
    var lines = [];

    if (!metaRoot) {
      return lines;
    }

    var paragraphs = metaRoot.querySelectorAll('p');
    for (var i = 0; i < paragraphs.length; i += 1) {
      var text = asString(paragraphs[i].textContent);
      if (text) {
        lines.push(text);
      }
    }

    return lines;
  }

  function parsePrimaryStatRow(root) {
    var scope = root || document;
    var row = scope.querySelector("table[id*='stats_standard'] tbody tr") || scope.querySelector('table tbody tr');
    if (!row) {
      return null;
    }

    return {
      season: readCell(row, 'season'),
      competition: readCell(row, 'comp') || readCell(row, 'league_name'),
      squad: readCell(row, 'squad') || readCell(row, 'team'),
      appearances: readCell(row, 'games') || readCell(row, 'matches'),
      starts: readCell(row, 'games_starts') || readCell(row, 'starts'),
      minutes: readCell(row, 'minutes') || readCell(row, 'minutes_90s'),
      goals: readCell(row, 'goals') || readCell(row, 'gls'),
      assists: readCell(row, 'assists') || readCell(row, 'ast')
    };
  }

  function parsePlayerContext(root, fallbackUrl) {
    var scope = root || document;
    var resolvedUrl = toAbsoluteUrl(fallbackUrl || asString((scope.location || {}).href) || asString(window.location.href));
    var rawName = asString((scope.querySelector('h1') || {}).textContent);
    var name = rawName
      .replace(/\s+/g, ' ')
      .replace(/\s+\d{4}(?:-\d{4})?\s+Match Logs\s*$/i, '')
      .replace(/\s+Match Logs\s*$/i, '')
      .trim();
    var position = '';
    var metaLines = parseMetaParagraphs(scope);
    var profileUrlMatch = resolvedUrl.match(/^(https?:\/\/[^\/]+\/en\/players\/[^\/]+\/[^\/?#]+)/i);
    var profileUrl = profileUrlMatch ? profileUrlMatch[1] : resolvedUrl;

    for (var i = 0; i < metaLines.length; i += 1) {
      var line = metaLines[i];
      if (line.indexOf('Position:') === 0) {
        position = asString(line.replace('Position:', ''));
        break;
      }
    }

    return {
      id: playerIdFromUrl(profileUrl),
      name: name,
      url: profileUrl,
      position: position
    };
  }

  function parsePlayerSeasonStatsFromDocument(doc) {
    var scope = doc || document;
    var standardRow = scope.querySelector("table[id*='stats_standard'] tbody tr");
    var playingTimeRow = scope.querySelector("table[id*='stats_playing_time'] tbody tr");

    var performance = {
      goals: readRowCell(standardRow, 'goals') || readRowCell(standardRow, 'gls'),
      assists: readRowCell(standardRow, 'assists') || readRowCell(standardRow, 'ast'),
      goals_pens: readRowCell(standardRow, 'goals_pens') || readRowCell(standardRow, 'pk'),
      penalties_made: readRowCell(standardRow, 'pens_made') || readRowCell(standardRow, 'pk'),
      penalties_attempted: readRowCell(standardRow, 'pens_att') || readRowCell(standardRow, 'pkatt'),
      yellow_cards: readRowCell(standardRow, 'cards_yellow') || readRowCell(standardRow, 'crdy'),
      red_cards: readRowCell(standardRow, 'cards_red') || readRowCell(standardRow, 'crdr'),
      xg: readRowCell(standardRow, 'xg'),
      npxg: readRowCell(standardRow, 'npxg'),
      xa: readRowCell(standardRow, 'xg_assist') || readRowCell(standardRow, 'xa'),
      npxg_xa: readRowCell(standardRow, 'npxg_xg_assist') || readRowCell(standardRow, 'npxg_xa')
    };

    var playingTime = {
      appearances: readRowCell(playingTimeRow, 'games') || readRowCell(standardRow, 'games') || readRowCell(standardRow, 'matches'),
      starts: readRowCell(playingTimeRow, 'games_starts') || readRowCell(standardRow, 'games_starts') || readRowCell(standardRow, 'starts'),
      minutes: readRowCell(playingTimeRow, 'minutes') || readRowCell(standardRow, 'minutes'),
      minutes_90s: readRowCell(playingTimeRow, 'minutes_90s') || readRowCell(standardRow, 'minutes_90s'),
      complete_games: readRowCell(playingTimeRow, 'games_complete'),
      substitute_appearances: readRowCell(playingTimeRow, 'games_subs'),
      subbed_in: readRowCell(playingTimeRow, 'games_subbed_in'),
      subbed_out: readRowCell(playingTimeRow, 'games_subbed_out'),
      minutes_per_game: readRowCell(playingTimeRow, 'minutes_per_game'),
      minutes_per_start: readRowCell(playingTimeRow, 'minutes_per_start'),
      minutes_per_90: readRowCell(playingTimeRow, 'minutes_per90')
    };

    var per90 = {
      goals: readRowCell(standardRow, 'goals_per90') || readRowCell(standardRow, 'gls_per90'),
      assists: readRowCell(standardRow, 'assists_per90') || readRowCell(standardRow, 'ast_per90'),
      goal_assists: readRowCell(standardRow, 'goals_assists_per90') || readRowCell(standardRow, 'g_a_per90'),
      goals_pens: readRowCell(standardRow, 'goals_pens_per90') || readRowCell(standardRow, 'pk_per90'),
      xg: readRowCell(standardRow, 'xg_per90'),
      xa: readRowCell(standardRow, 'xg_assist_per90') || readRowCell(standardRow, 'xa_per90'),
      npxg: readRowCell(standardRow, 'npxg_per90'),
      npxg_xa: readRowCell(standardRow, 'npxg_xg_assist_per90') || readRowCell(standardRow, 'npxg_xa_per90')
    };

    return {
      performance: performance,
      playing_time: playingTime,
      per_90_minutes: per90
    };
  }

  function parseRecentMatchRows(limit, root, playerContext) {
    var rows = pickRows([
      "table[id*='matchlogs'] tbody tr",
      "table.stats_table tbody tr"
    ], root || document);

    var player = playerContext || parsePlayerContext(root, asString(window.location.href));

    var items = [];
    for (var i = 0; i < rows.length; i += 1) {
      if (items.length >= limit) {
        break;
      }

      var row = rows[i];
      if (!row || row.classList.contains('thead')) {
        continue;
      }

      var dateCell = row.querySelector("th[data-stat='date']") || row.querySelector("td[data-stat='date']");
      var date = asString(dateCell ? dateCell.textContent : '');
      var opponent = readCell(row, 'opponent') || readCell(row, 'opponent_team') || readCell(row, 'opponent_club');

      if (!date && !opponent) {
        continue;
      }

      items.push({
        date: date,
        competition: readCell(row, 'comp') || readCell(row, 'league_name'),
        round: readCell(row, 'round'),
        venue: readCell(row, 'venue'),
        opponent: opponent,
        result: readCell(row, 'result') || readCell(row, 'score'),
        player_position: player.position
      });
    }

    return items;
  }

  function extractMatchlogSeasonRank(url) {
    var href = asString(url);
    var tokenMatch = href.match(/\/matchlogs\/([^\/]+)\//i);
    var token = tokenMatch ? asString(tokenMatch[1]).toLowerCase() : '';

    if (!token) {
      return -1;
    }

    if (token === 'nat_tm') {
      return 0;
    }

    var rangeMatch = token.match(/^(\d{4})-(\d{4})$/);
    if (rangeMatch) {
      return Number(rangeMatch[1]) * 10 + 1;
    }

    var yearMatch = token.match(/^(\d{4})$/);
    if (yearMatch) {
      return Number(yearMatch[1]) * 10;
    }

    return 1;
  }

  function pickPreferredPlayerMatchlogSummaryUrl(root) {
    var scope = root || document;
    var anchors = scope.querySelectorAll("a[href*='/matchlogs/'][href*='/summary/']");
    var seen = {};
    var candidates = [];

    for (var i = 0; i < anchors.length; i += 1) {
      var href = toAbsoluteUrl(asString(anchors[i].getAttribute('href')));
      if (!href || seen[href]) {
        continue;
      }
      seen[href] = true;
      candidates.push(href);
    }

    if (!candidates.length) {
      return '';
    }

    candidates.sort(function (a, b) {
      var rankA = extractMatchlogSeasonRank(a);
      var rankB = extractMatchlogSeasonRank(b);
      if (rankA !== rankB) {
        return rankB - rankA;
      }
      return a < b ? 1 : -1;
    });

    return candidates[0];
  }

  function isCloudflareChallengePage() {
    var title = asString(document.title).toLowerCase();
    var href = asString(window.location.href);
    var bodyText = asString((document.body || {}).innerText).toLowerCase();

    if (title.indexOf('just a moment') >= 0) {
      return true;
    }

    if (href.indexOf('__cf_chl_rt_tk=') >= 0 || href.indexOf('/cdn-cgi/challenge-platform/') >= 0) {
      return true;
    }

    return bodyText.indexOf('checking your browser before accessing') >= 0;
  }

  function isCloudflareChallengeDocument(doc, url) {
    var title = asString((doc && doc.title) || '').toLowerCase();
    var href = asString(url || '');
    var bodyText = asString(doc && doc.body ? doc.body.innerText : '').toLowerCase();

    if (title.indexOf('just a moment') >= 0) {
      return true;
    }

    if (href.indexOf('__cf_chl_rt_tk=') >= 0 || href.indexOf('/cdn-cgi/challenge-platform/') >= 0) {
      return true;
    }

    return bodyText.indexOf('checking your browser before accessing') >= 0;
  }

  function toNumber(value) {
    var text = asString(value)
      .replace(/,/g, '')
      .replace(/%/g, '')
      .replace(/[A-Za-z]/g, ' ')
      .trim();
    if (!text) {
      return null;
    }

    var match = text.match(/-?\d+(?:\.\d+)?/);
    if (!match) {
      return null;
    }

    var n = Number(match[0]);
    return Number.isFinite(n) ? n : null;
  }

  function normalizeRatio(value, fallback) {
    var n = Number(value);
    if (!Number.isFinite(n)) {
      return fallback;
    }
    if (n < 0) {
      return 0;
    }
    if (n > 1) {
      return 1;
    }
    return n;
  }

  function clamp(value, minValue, maxValue) {
    if (value < minValue) {
      return minValue;
    }
    if (value > maxValue) {
      return maxValue;
    }
    return value;
  }

  function roundNumber(value, digits) {
    var n = Number(value);
    if (!Number.isFinite(n)) {
      return 0;
    }
    var precision = Number.isFinite(Number(digits)) ? Math.max(0, Math.floor(Number(digits))) : 3;
    return Number(n.toFixed(precision));
  }

  function normalizeTeamName(value) {
    return asString(value)
      .toLowerCase()
      .replace(/\b(men|women|stats|national team)\b/g, ' ')
      .replace(/[^a-z0-9]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function parseMatchScore(resultText, goalsForText, goalsAgainstText) {
    var goalsFor = toNumber(goalsForText);
    var goalsAgainst = toNumber(goalsAgainstText);
    if (goalsFor !== null && goalsAgainst !== null) {
      return {
        goals_for: goalsFor,
        goals_against: goalsAgainst
      };
    }

    var text = asString(resultText).replace(/[–—]/g, '-');
    var scoreMatch = text.match(/(\d+)\s*-\s*(\d+)/);
    if (!scoreMatch) {
      return {
        goals_for: null,
        goals_against: null
      };
    }

    return {
      goals_for: Number(scoreMatch[1]),
      goals_against: Number(scoreMatch[2])
    };
  }

  function inferMatchOutcome(match) {
    var score = parseMatchScore(match && match.result, match && match.goals_for, match && match.goals_against);
    if (score.goals_for !== null && score.goals_against !== null) {
      if (score.goals_for > score.goals_against) {
        return 'win';
      }
      if (score.goals_for < score.goals_against) {
        return 'loss';
      }
      return 'draw';
    }

    var text = asString(match && match.result).toLowerCase();
    if (/\bw\b/.test(text) || text.indexOf('win') >= 0) {
      return 'win';
    }
    if (/\bl\b/.test(text) || text.indexOf('loss') >= 0 || text.indexOf('lost') >= 0) {
      return 'loss';
    }
    if (/\bd\b/.test(text) || text.indexOf('draw') >= 0) {
      return 'draw';
    }
    return 'unknown';
  }

  function computeRecentSummary(matches) {
    var items = Array.isArray(matches) ? matches : [];
    var wins = 0;
    var draws = 0;
    var losses = 0;
    var weightedPoints = 0;
    var weightTotal = 0;
    var goalsForTotal = 0;
    var goalsAgainstTotal = 0;
    var xgForTotal = 0;
    var xgAgainstTotal = 0;
    var xgForCount = 0;
    var xgAgainstCount = 0;

    for (var i = 0; i < items.length; i += 1) {
      var match = items[i] || {};
      var weight = Math.exp(-0.25 * i);
      var outcome = inferMatchOutcome(match);
      var points = 0;
      if (outcome === 'win') {
        wins += 1;
        points = 3;
      } else if (outcome === 'draw') {
        draws += 1;
        points = 1;
      } else if (outcome === 'loss') {
        losses += 1;
      }

      weightedPoints += points * weight;
      weightTotal += weight;

      var score = parseMatchScore(match.result, match.goals_for, match.goals_against);
      if (score.goals_for !== null) {
        goalsForTotal += score.goals_for;
      }
      if (score.goals_against !== null) {
        goalsAgainstTotal += score.goals_against;
      }

      var xgFor = toNumber(match.xg_for);
      var xgAgainst = toNumber(match.xg_against);
      if (xgFor !== null) {
        xgForTotal += xgFor;
        xgForCount += 1;
      }
      if (xgAgainst !== null) {
        xgAgainstTotal += xgAgainst;
        xgAgainstCount += 1;
      }
    }

    var matchCount = items.length;
    var goalsForPerMatch = matchCount ? goalsForTotal / matchCount : 0;
    var goalsAgainstPerMatch = matchCount ? goalsAgainstTotal / matchCount : 0;
    var xgForPerMatch = xgForCount ? xgForTotal / xgForCount : goalsForPerMatch;
    var xgAgainstPerMatch = xgAgainstCount ? xgAgainstTotal / xgAgainstCount : goalsAgainstPerMatch;
    var weightedPpm = weightTotal ? weightedPoints / weightTotal : 0;
    var formScore = normalizeRatio(weightedPpm / 3, 0.5);
    var attackRating = goalsForPerMatch * 0.6 + xgForPerMatch * 0.4;
    var defensiveWeakness = goalsAgainstPerMatch * 0.6 + xgAgainstPerMatch * 0.4;

    return {
      matches: matchCount,
      wins: wins,
      draws: draws,
      losses: losses,
      win_rate: matchCount ? wins / matchCount : 0,
      points_per_match: matchCount ? (wins * 3 + draws) / matchCount : 0,
      weighted_points_per_match: weightedPpm,
      form_score: formScore,
      goals_for_per_match: goalsForPerMatch,
      goals_against_per_match: goalsAgainstPerMatch,
      xg_for_per_match: xgForPerMatch,
      xg_against_per_match: xgAgainstPerMatch,
      attack_rating: attackRating,
      defensive_weakness: defensiveWeakness
    };
  }

  function computeKeyPlayers(players, limit) {
    var items = Array.isArray(players) ? players.slice() : [];
    var maxItems = normalizeLimit(limit, 5, 10);
    var ranked = items.map(function (player) {
      var goals = toNumber(player.goals) || 0;
      var assists = toNumber(player.assists) || 0;
      var minutes = toNumber(player.minutes) || 0;
      var impact = goals * 4 + assists * 3 + minutes / 300;

      return {
        id: player.id,
        name: player.name,
        url: player.url,
        position: player.position,
        nation: player.nation,
        goals: goals,
        assists: assists,
        minutes: minutes,
        impact_score: roundNumber(impact, 3)
      };
    }).sort(function (a, b) {
      return b.impact_score - a.impact_score;
    });

    return ranked.slice(0, maxItems);
  }

  function computeSquadStrength(keyPlayers) {
    var items = Array.isArray(keyPlayers) ? keyPlayers : [];
    if (!items.length) {
      return 0.5;
    }

    var total = 0;
    for (var i = 0; i < items.length; i += 1) {
      total += items[i].impact_score;
    }

    return normalizeRatio((total / items.length) / 8, 0.5);
  }

  function rankToScore(ranking) {
    if (!ranking) {
      return 0.5;
    }

    var rank = toNumber(ranking.rank);
    if (rank !== null && rank > 0) {
      return normalizeRatio((5 - rank) / 4, 0.5);
    }

    var points = toNumber(ranking.points);
    if (points !== null) {
      return normalizeRatio(points / 9, 0.5);
    }

    return 0.5;
  }

  function factorial(n) {
    var result = 1;
    for (var i = 2; i <= n; i += 1) {
      result *= i;
    }
    return result;
  }

  function poissonProbability(lambda, goals) {
    return Math.exp(-lambda) * Math.pow(lambda, goals) / factorial(goals);
  }

  async function fetchDocument(url) {
    var absoluteUrl = toAbsoluteUrl(url);
    var response = await fetch(absoluteUrl, { credentials: 'include' });
    if (!response.ok) {
      return {
        success: false,
        error: 'HTTP ' + String(response.status),
        url: absoluteUrl
      };
    }

    var html = await response.text();
    var parser = new DOMParser();
    var doc = parser.parseFromString(html, 'text/html');
    if (isCloudflareChallengeDocument(doc, absoluteUrl)) {
      return {
        success: false,
        error: 'cloudflare_blocked',
        url: absoluteUrl
      };
    }

    return {
      success: true,
      doc: doc,
      url: absoluteUrl
    };
  }

  function extractTeamSnapshotFromDocument(doc, teamUrl, options) {
    var settings = options || {};
    var recentLimit = normalizeLimit(settings.recent_limit, 10, 20);
    var keyPlayerLimit = normalizeLimit(settings.player_limit, 5, 10);
    var name = asString((doc.querySelector('h1') || {}).textContent);
    var players = parseTeamPlayersFromDocument(doc, 60);
    var keyPlayers = computeKeyPlayers(players, keyPlayerLimit);
    var recentMatches = parseTeamMatchRows(recentLimit, doc);
    var recentSummary = computeRecentSummary(recentMatches);

    return {
      name: name,
      normalized_name: normalizeTeamName(name),
      url: toAbsoluteUrl(teamUrl),
      meta: parseMetaParagraphs(doc),
      players: players,
      key_players: keyPlayers,
      recent_matches: recentMatches,
      recent_summary: recentSummary,
      squad_strength: computeSquadStrength(keyPlayers)
    };
  }

  async function fetchTeamSnapshot(teamUrl, options) {
    var result = await fetchDocument(teamUrl);
    if (!result.success) {
      return result;
    }

    var snapshot = extractTeamSnapshotFromDocument(result.doc, result.url, options);
    if (!snapshot.name) {
      return {
        success: false,
        error: 'team_not_found',
        url: result.url
      };
    }

    return {
      success: true,
      data: snapshot
    };
  }

  function waitMs(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function scheduleTabClose(tab, closeDelayMs) {
    var delay = normalizeLimit(closeDelayMs, 1200, 10000);
    setTimeout(function () {
      try {
        if (tab && !tab.closed) {
          tab.close();
        }
      } catch (_closeError) {
      }
    }, delay);
  }

  async function readTeamSnapshotFromTab(tab, teamUrl, options, timeoutMs) {
    var absoluteUrl = toAbsoluteUrl(teamUrl);
    var targetTeamIdMatch = absoluteUrl.match(/\/squads\/([^\/]+)\//i);
    var targetTeamId = targetTeamIdMatch ? asString(targetTeamIdMatch[1]).toLowerCase() : '';

    try {
      if (asString((tab.location || {}).href) !== absoluteUrl) {
        tab.location.href = absoluteUrl;
      }
    } catch (_navigateError) {
    }

    var timeoutAt = Date.now() + normalizeLimit(timeoutMs, 35000, 90000);
    while (Date.now() < timeoutAt) {
      if (!tab || tab.closed) {
        return {
          success: false,
          error: 'tab_closed',
          url: absoluteUrl
        };
      }

      try {
        var href = asString((tab.location || {}).href);
        var doc = tab.document;
        var readyState = asString(doc && doc.readyState).toLowerCase();
        var isReady = readyState === 'complete' || readyState === 'interactive';
        var currentTeamIdMatch = href.match(/\/squads\/([^\/]+)\//i);
        var currentTeamId = currentTeamIdMatch ? asString(currentTeamIdMatch[1]).toLowerCase() : '';
        var targetMatched = !targetTeamId || (targetTeamId && currentTeamId === targetTeamId);

        if (isReady && href && href.indexOf('fbref.com') >= 0 && targetMatched) {
          if (isCloudflareChallengeDocument(doc, href)) {
            return {
              success: false,
              error: 'cloudflare_blocked',
              url: href
            };
          }

          var snapshot = extractTeamSnapshotFromDocument(doc, href, options);
          if (snapshot.name) {
            return {
              success: true,
              data: snapshot
            };
          }
        }
      } catch (_readError) {
      }

      await waitMs(200);
    }

    return {
      success: false,
      error: 'tab_read_timeout',
      url: absoluteUrl
    };
  }

  async function readTeamSnapshotFromNewTab(teamUrl, options, closeDelayMs) {
    var absoluteUrl = toAbsoluteUrl(teamUrl);
    var tab = window.open(absoluteUrl, '_blank');
    if (!tab) {
      return {
        success: false,
        error: 'popup_blocked',
        url: absoluteUrl
      };
    }

    var result = await readTeamSnapshotFromTab(tab, absoluteUrl, options, 35000);
    if (result.success) {
      scheduleTabClose(tab, closeDelayMs);
      return result;
    }

    try {
      if (!tab.closed) {
        tab.close();
      }
    } catch (_timeoutCloseError) {
    }

    return result;
  }

  async function readTwoTeamsFromSingleTab(homeUrl, awayUrl, options, closeDelayMs) {
    var homeAbsoluteUrl = toAbsoluteUrl(homeUrl);
    var tab = window.open(homeAbsoluteUrl, '_blank');
    if (!tab) {
      return {
        success: false,
        error: 'popup_blocked',
        home: {
          success: false,
          error: 'popup_blocked',
          url: homeAbsoluteUrl
        },
        away: {
          success: false,
          error: 'popup_blocked',
          url: toAbsoluteUrl(awayUrl)
        }
      };
    }

    var homeResult = await readTeamSnapshotFromTab(tab, homeUrl, options, 35000);
    if (!homeResult.success) {
      try {
        if (!tab.closed) {
          tab.close();
        }
      } catch (_homeCloseError) {
      }
      return {
        success: false,
        error: 'home_read_failed',
        home: homeResult,
        away: {
          success: false,
          error: 'skipped',
          url: toAbsoluteUrl(awayUrl)
        }
      };
    }

    var awayResult = await readTeamSnapshotFromTab(tab, awayUrl, options, 35000);
    if (!awayResult.success) {
      try {
        if (!tab.closed) {
          tab.close();
        }
      } catch (_awayCloseError) {
      }
      return {
        success: false,
        error: 'away_read_failed',
        home: homeResult,
        away: awayResult
      };
    }

    scheduleTabClose(tab, closeDelayMs);
    return {
      success: true,
      home: homeResult,
      away: awayResult
    };
  }

  function findRankingEntry(parsed, snapshot) {
    var teams = parsed && Array.isArray(parsed.teams) ? parsed.teams : [];
    var targetUrl = asString(snapshot && snapshot.url);
    var targetName = normalizeTeamName(snapshot && snapshot.name);

    for (var i = 0; i < teams.length; i += 1) {
      var team = teams[i];
      if (targetUrl && asString(team.url) === targetUrl) {
        return team;
      }
      if (targetName && normalizeTeamName(team.name) === targetName) {
        return team;
      }
    }

    return null;
  }

  async function fetchCompetitionRankings(competitionUrl, teamA, teamB) {
    var result = await fetchDocument(competitionUrl || 'https://fbref.com/en/comps/1/World-Cup-Stats');
    if (!result.success) {
      return {
        success: false,
        error: result.error,
        url: result.url
      };
    }

    var parsed = parseCompetitionGroups(128, result.doc);
    return {
      success: true,
      url: result.url,
      team_a: findRankingEntry(parsed, teamA),
      team_b: findRankingEntry(parsed, teamB)
    };
  }

  function buildHeadToHeadSummary(teamA, teamB) {
    var matches = Array.isArray(teamA && teamA.recent_matches) ? teamA.recent_matches : [];
    var targetNames = {};
    targetNames[normalizeTeamName(teamB && teamB.name)] = true;
    targetNames[normalizeTeamName(teamB && teamB.name).replace(/\bmen\b/g, '').trim()] = true;

    var meetings = [];
    var winsA = 0;
    var winsB = 0;
    var draws = 0;

    for (var i = 0; i < matches.length; i += 1) {
      var match = matches[i];
      var opponentName = normalizeTeamName(match && match.opponent);
      if (!opponentName || !targetNames[opponentName]) {
        continue;
      }

      var outcome = inferMatchOutcome(match);
      if (outcome === 'win') {
        winsA += 1;
      } else if (outcome === 'loss') {
        winsB += 1;
      } else if (outcome === 'draw') {
        draws += 1;
      }

      meetings.push({
        date: match.date,
        competition: match.competition,
        round: match.round,
        result_for_team_a: outcome,
        result_text: match.result,
        venue: match.venue
      });
    }

    return {
      total_matches: meetings.length,
      team_a_wins: winsA,
      draws: draws,
      team_b_wins: winsB,
      recent_meetings: meetings.slice(0, 5),
      edge_score: meetings.length ? (winsA - winsB) / meetings.length : 0
    };
  }

  function buildComparison(teamA, teamB, rankings, competitionUrl) {
    var headToHead = buildHeadToHeadSummary(teamA, teamB);
    var rankingA = rankings && rankings.team_a ? rankings.team_a : null;
    var rankingB = rankings && rankings.team_b ? rankings.team_b : null;

    return {
      competition_url: competitionUrl,
      team_a: {
        name: teamA.name,
        url: teamA.url,
        ranking: rankingA,
        recent_summary: teamA.recent_summary,
        key_players: teamA.key_players
      },
      team_b: {
        name: teamB.name,
        url: teamB.url,
        ranking: rankingB,
        recent_summary: teamB.recent_summary,
        key_players: teamB.key_players
      },
      historical_head_to_head: headToHead
    };
  }

  function normalizeProbabilitySpread(homeWin, draw, awayWin) {
    var total = homeWin + draw + awayWin;
    if (!Number.isFinite(total) || total <= 0) {
      return {
        home_win: 1 / 3,
        draw: 1 / 3,
        away_win: 1 / 3
      };
    }

    return {
      home_win: homeWin / total,
      draw: draw / total,
      away_win: awayWin / total
    };
  }

  function pickPredictedOutcome(homeWin, draw, awayWin, tieTolerance) {
    var tolerance = Number.isFinite(tieTolerance) ? Math.max(0, tieTolerance) : 0.001;
    var maxProb = Math.max(homeWin, draw, awayWin);
    var topOutcomes = [];

    if (Math.abs(homeWin - maxProb) <= tolerance) {
      topOutcomes.push('home_win');
    }
    if (Math.abs(draw - maxProb) <= tolerance) {
      topOutcomes.push('draw');
    }
    if (Math.abs(awayWin - maxProb) <= tolerance) {
      topOutcomes.push('away_win');
    }

    if (topOutcomes.length <= 1) {
      return topOutcomes[0] || 'draw';
    }

    // If top outcomes are tied, prefer draw to avoid arbitrary winner bias.
    return 'draw';
  }

  function computePredictionConfidence(homeWin, draw, awayWin, headToHeadEdge) {
    var ranked = [homeWin, draw, awayWin]
      .filter(function (value) { return Number.isFinite(value); })
      .sort(function (a, b) { return b - a; });

    var top = ranked[0] || 0;
    var second = ranked[1] || 0;
    var probabilityGap = Math.max(0, top - second);
    var headToHeadSignal = Math.abs(headToHeadEdge) * 0.12;

    return clamp(probabilityGap * 1.8 + headToHeadSignal, 0, 1);
  }

  function buildFactorInsights(factors) {
    var items = Array.isArray(factors) ? factors.slice() : [];
    items.sort(function (a, b) {
      return Math.abs(b.edge) - Math.abs(a.edge);
    });

    var top = items.slice(0, 3);
    var insights = [];
    for (var i = 0; i < top.length; i += 1) {
      var factor = top[i];
      if (Math.abs(factor.edge) < 0.0001) {
        continue;
      }

      var side = factor.edge > 0 ? 'home' : 'away';
      insights.push({
        factor: factor.key,
        label: factor.label,
        favored_side: side,
        edge: roundNumber(Math.abs(factor.edge), 4),
        home_value: roundNumber(factor.home_value, 4),
        away_value: roundNumber(factor.away_value, 4)
      });
    }

    return insights;
  }

  function buildPredictionExplanation(predictedOutcome, homeWin, draw, awayWin, factors, confidence, mostLikelyScore, neutralSite) {
    var insights = buildFactorInsights(factors);
    var summary = '';
    var gap = Math.abs(homeWin - awayWin);

    if (predictedOutcome === 'home_win') {
      summary = gap < 0.05
        ? 'Model shows only a slight edge to home team win.'
        : 'Model leans to home team win based on stronger weighted indicators.';
    } else if (predictedOutcome === 'away_win') {
      summary = gap < 0.05
        ? 'Model shows only a slight edge to away team win.'
        : 'Model leans to away team win based on stronger weighted indicators.';
    } else {
      summary = 'Model sees balanced strengths and a draw is the most likely outcome.';
    }

    return {
      predicted_outcome: predictedOutcome,
      summary: summary,
      confidence_band: confidence >= 0.65 ? 'high' : (confidence >= 0.4 ? 'medium' : 'low'),
      key_reasons: insights,
      probability_spread: {
        home_win: roundNumber(homeWin, 4),
        draw: roundNumber(draw, 4),
        away_win: roundNumber(awayWin, 4),
        gap_home_vs_away: roundNumber(Math.abs(homeWin - awayWin), 4)
      },
      scenario_note: {
        neutral_site: !!neutralSite,
        most_likely_score: {
          home_goals: mostLikelyScore.home_goals,
          away_goals: mostLikelyScore.away_goals,
          probability: roundNumber(mostLikelyScore.probability, 4)
        }
      },
      model_notes: [
        'Probabilities are generated from weighted recent form, attack/defense profile, squad strength, ranking, and head-to-head edge.',
        'This is a statistical estimate from available FBref data, not a guaranteed result.'
      ]
    };
  }

  function predictHomeCacheKey() {
    return '__mediause_fifa2026_predict_home_snapshot';
  }

  function loadPredictHomeSnapshotFromCache() {
    var key = predictHomeCacheKey();
    var raw = '';

    try {
      raw = asString(window.sessionStorage.getItem(key));
    } catch (_sessionError) {
      raw = '';
    }

    if (!raw) {
      try {
        raw = asString(window.localStorage.getItem(key));
      } catch (_localError) {
        raw = '';
      }
    }

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (_parseError) {
      return null;
    }
  }

  function savePredictHomeSnapshotToCache(snapshot) {
    var key = predictHomeCacheKey();
    var text = JSON.stringify(snapshot || {});

    try {
      window.sessionStorage.setItem(key, text);
      return true;
    } catch (_sessionError) {
    }

    try {
      window.localStorage.setItem(key, text);
      return true;
    } catch (_localError) {
    }

    return false;
  }

  function clearPredictHomeSnapshotCache() {
    var key = predictHomeCacheKey();
    try {
      window.sessionStorage.removeItem(key);
    } catch (_sessionError) {
    }
    try {
      window.localStorage.removeItem(key);
    } catch (_localError) {
    }
  }

  function compareTeamACacheKey() {
    return '__mediause_fifa2026_compare_team_a_snapshot';
  }

  function loadCompareTeamASnapshotFromCache() {
    var key = compareTeamACacheKey();
    var raw = '';

    try {
      raw = asString(window.sessionStorage.getItem(key));
    } catch (_sessionError) {
      raw = '';
    }

    if (!raw) {
      try {
        raw = asString(window.localStorage.getItem(key));
      } catch (_localError) {
        raw = '';
      }
    }

    if (!raw) {
      return null;
    }

    try {
      return JSON.parse(raw);
    } catch (_parseError) {
      return null;
    }
  }

  function saveCompareTeamASnapshotToCache(snapshot) {
    var key = compareTeamACacheKey();
    var text = JSON.stringify(snapshot || {});

    try {
      window.sessionStorage.setItem(key, text);
      return true;
    } catch (_sessionError) {
    }

    try {
      window.localStorage.setItem(key, text);
      return true;
    } catch (_localError) {
    }

    return false;
  }

  function clearCompareTeamASnapshotCache() {
    var key = compareTeamACacheKey();
    try {
      window.sessionStorage.removeItem(key);
    } catch (_sessionError) {
    }
    try {
      window.localStorage.removeItem(key);
    } catch (_localError) {
    }
  }

  function buildPrediction(teamA, teamB, rankings, competitionUrl, neutralSite) {
    var comparison = buildComparison(teamA, teamB, rankings, competitionUrl);
    var recentA = teamA.recent_summary;
    var recentB = teamB.recent_summary;
    var rankScoreA = rankToScore(comparison.team_a.ranking);
    var rankScoreB = rankToScore(comparison.team_b.ranking);
    var headToHeadEdge = comparison.historical_head_to_head.edge_score;
    var homeAdvantage = neutralSite ? 0 : 0.18;

    var lambdaHome = clamp(
      0.2,
      3.5,
      0.85
        + recentA.attack_rating * 0.45
        + recentB.defensive_weakness * 0.25
        + (recentA.form_score - recentB.form_score) * 0.35
        + (teamA.squad_strength - teamB.squad_strength) * 0.25
        + (rankScoreA - rankScoreB) * 0.15
        + headToHeadEdge * 0.12
        + homeAdvantage
    );

    var lambdaAway = clamp(
      0.2,
      3.5,
      0.8
        + recentB.attack_rating * 0.45
        + recentA.defensive_weakness * 0.25
        + (recentB.form_score - recentA.form_score) * 0.35
        + (teamB.squad_strength - teamA.squad_strength) * 0.25
        + (rankScoreB - rankScoreA) * 0.15
        - headToHeadEdge * 0.12
    );

    var homeWin = 0;
    var draw = 0;
    var awayWin = 0;
    var mostLikelyScore = { home_goals: 0, away_goals: 0, probability: 0 };

    for (var homeGoals = 0; homeGoals <= 5; homeGoals += 1) {
      var homeProb = poissonProbability(lambdaHome, homeGoals);
      for (var awayGoals = 0; awayGoals <= 5; awayGoals += 1) {
        var probability = homeProb * poissonProbability(lambdaAway, awayGoals);
        if (homeGoals > awayGoals) {
          homeWin += probability;
        } else if (homeGoals < awayGoals) {
          awayWin += probability;
        } else {
          draw += probability;
        }

        if (probability > mostLikelyScore.probability) {
          mostLikelyScore = {
            home_goals: homeGoals,
            away_goals: awayGoals,
            probability: probability
          };
        }
      }
    }

    var normalizedProbabilities = normalizeProbabilitySpread(homeWin, draw, awayWin);
    homeWin = normalizedProbabilities.home_win;
    draw = normalizedProbabilities.draw;
    awayWin = normalizedProbabilities.away_win;

    var predictedOutcome = pickPredictedOutcome(homeWin, draw, awayWin, 0.0015);
    var confidence = computePredictionConfidence(homeWin, draw, awayWin, headToHeadEdge);
    var factorBreakdown = [
      {
        key: 'recent_form',
        label: 'Recent form score',
        edge: recentA.form_score - recentB.form_score,
        home_value: recentA.form_score,
        away_value: recentB.form_score
      },
      {
        key: 'attack_rating',
        label: 'Attack rating',
        edge: recentA.attack_rating - recentB.attack_rating,
        home_value: recentA.attack_rating,
        away_value: recentB.attack_rating
      },
      {
        key: 'defensive_edge',
        label: 'Defensive edge (lower weakness is better)',
        edge: recentB.defensive_weakness - recentA.defensive_weakness,
        home_value: recentA.defensive_weakness,
        away_value: recentB.defensive_weakness
      },
      {
        key: 'squad_strength',
        label: 'Squad strength',
        edge: teamA.squad_strength - teamB.squad_strength,
        home_value: teamA.squad_strength,
        away_value: teamB.squad_strength
      },
      {
        key: 'ranking_score',
        label: 'Ranking score',
        edge: rankScoreA - rankScoreB,
        home_value: rankScoreA,
        away_value: rankScoreB
      },
      {
        key: 'head_to_head',
        label: 'Head-to-head edge',
        edge: headToHeadEdge,
        home_value: comparison.historical_head_to_head.team_a_wins,
        away_value: comparison.historical_head_to_head.team_b_wins
      }
    ];
    var explanation = buildPredictionExplanation(
      predictedOutcome,
      homeWin,
      draw,
      awayWin,
      factorBreakdown,
      confidence,
      mostLikelyScore,
      neutralSite
    );

    return {
      competition_url: competitionUrl,
      neutral_site: !!neutralSite,
      home_team: {
        name: teamA.name,
        url: teamA.url
      },
      away_team: {
        name: teamB.name,
        url: teamB.url
      },
      probabilities: {
        home_win: roundNumber(homeWin, 4),
        draw: roundNumber(draw, 4),
        away_win: roundNumber(awayWin, 4)
      },
      expected_goals: {
        home: roundNumber(lambdaHome, 3),
        away: roundNumber(lambdaAway, 3)
      },
      most_likely_score: {
        home_goals: mostLikelyScore.home_goals,
        away_goals: mostLikelyScore.away_goals,
        probability: roundNumber(mostLikelyScore.probability, 4)
      },
      confidence: roundNumber(confidence, 4),
      explanation: explanation,
      features: {
        recent_form: {
          home: roundNumber(recentA.form_score, 4),
          away: roundNumber(recentB.form_score, 4)
        },
        attack_rating: {
          home: roundNumber(recentA.attack_rating, 4),
          away: roundNumber(recentB.attack_rating, 4)
        },
        defensive_weakness: {
          home: roundNumber(recentA.defensive_weakness, 4),
          away: roundNumber(recentB.defensive_weakness, 4)
        },
        squad_strength: {
          home: roundNumber(teamA.squad_strength, 4),
          away: roundNumber(teamB.squad_strength, 4)
        },
        ranking_score: {
          home: roundNumber(rankScoreA, 4),
          away: roundNumber(rankScoreB, 4)
        },
        historical_head_to_head: comparison.historical_head_to_head
      }
    };
  }

  async function compareTeams(payload) {
    return errorResult(
      'fifa2026.compare.teams.workflow_required',
      'compareTeams is disabled for direct call; use workflow sequence captureCompareTeamA -> compareTeamsFromWorkflow'
    );
  }

  async function captureCompareTeamA(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var teamAUrl = resolveTeamUrl({ url: payload && payload.team_a_url });
    if (!teamAUrl) {
      return errorResult('fifa2026.compare.teams.url_required', 'team_a_url is required');
    }

    if (teamAUrl.indexOf('/squads/') < 0) {
      return errorResult('fifa2026.compare.teams.invalid_url', 'team_a_url must be a fbref team squad URL');
    }

    var options = {
      recent_limit: normalizeLimit(payload && payload.recent_limit, 10, 20),
      player_limit: normalizeLimit(payload && payload.player_limit, 5, 10)
    };

    var snapshot = extractTeamSnapshotFromDocument(document, teamAUrl, options);
    if (!snapshot.name) {
      return errorResult('fifa2026.compare.teams.not_found', 'Failed to capture team_a snapshot from current page');
    }

    if (!saveCompareTeamASnapshotToCache(snapshot)) {
      return errorResult('fifa2026.compare.teams.cache_failed', 'Failed to cache team_a snapshot in browser storage');
    }

    return successData({
      cached: true,
      name: snapshot.name,
      url: snapshot.url
    });
  }

  async function compareTeamsFromWorkflow(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var teamBUrl = resolveTeamUrl({ url: payload && payload.team_b_url });
    if (!teamBUrl) {
      return errorResult('fifa2026.compare.teams.url_required', 'team_b_url is required');
    }

    if (teamBUrl.indexOf('/squads/') < 0) {
      return errorResult('fifa2026.compare.teams.invalid_url', 'team_b_url must be a fbref team squad URL');
    }

    var teamASnapshot = loadCompareTeamASnapshotFromCache();
    if (!teamASnapshot || !teamASnapshot.name) {
      return errorResult('fifa2026.compare.teams.team_a_cache_missing', 'Team A snapshot is missing; run captureCompareTeamA step first');
    }

    var options = {
      recent_limit: normalizeLimit(payload && payload.recent_limit, 10, 20),
      player_limit: normalizeLimit(payload && payload.player_limit, 5, 10)
    };
    var teamBSnapshot = extractTeamSnapshotFromDocument(document, teamBUrl, options);
    if (!teamBSnapshot.name) {
      return errorResult('fifa2026.compare.teams.not_found', 'Failed to capture team_b snapshot from current page');
    }

    var competitionUrl = asString(payload && payload.competition_url) || 'https://fbref.com/en/comps/1/World-Cup-Stats';
    var rankings = await fetchCompetitionRankings(competitionUrl, teamASnapshot, teamBSnapshot);
    var comparison = buildComparison(teamASnapshot, teamBSnapshot, rankings.success ? rankings : null, competitionUrl);

    clearCompareTeamASnapshotCache();
    comparison.workflow_mode = 'sequential_navigation';

    return successData(comparison);
  }

  async function capturePredictHome(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var homeUrl = resolveTeamUrl({ url: payload && payload.home_url });
    if (!homeUrl) {
      return errorResult('fifa2026.predict.home.url_required', 'home_url is required');
    }

    if (homeUrl.indexOf('/squads/') < 0) {
      return errorResult('fifa2026.predict.home.invalid_url', 'home_url must be a fbref team squad URL');
    }

    var options = {
      recent_limit: normalizeLimit(payload && payload.recent_limit, 10, 20),
      player_limit: normalizeLimit(payload && payload.player_limit, 5, 10)
    };

    var snapshot = extractTeamSnapshotFromDocument(document, homeUrl, options);
    if (!snapshot.name) {
      return errorResult('fifa2026.predict.home.not_found', 'Failed to capture home team snapshot from current page');
    }

    if (!savePredictHomeSnapshotToCache(snapshot)) {
      return errorResult('fifa2026.predict.home.cache_failed', 'Failed to cache home team snapshot in browser storage');
    }

    return successData({
      cached: true,
      name: snapshot.name,
      url: snapshot.url
    });
  }

  async function predictMatchFromWorkflow(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var awayUrl = resolveTeamUrl({ url: payload && payload.away_url });
    if (!awayUrl) {
      return errorResult('fifa2026.predict.match.url_required', 'away_url is required');
    }

    if (awayUrl.indexOf('/squads/') < 0) {
      return errorResult('fifa2026.predict.match.invalid_url', 'away_url must be a fbref team squad URL');
    }

    var homeSnapshot = loadPredictHomeSnapshotFromCache();
    if (!homeSnapshot || !homeSnapshot.name) {
      return errorResult('fifa2026.predict.match.home_cache_missing', 'Home team snapshot is missing; run capturePredictHome step first');
    }

    var options = {
      recent_limit: normalizeLimit(payload && payload.recent_limit, 10, 20),
      player_limit: normalizeLimit(payload && payload.player_limit, 5, 10)
    };
    var awaySnapshot = extractTeamSnapshotFromDocument(document, awayUrl, options);
    if (!awaySnapshot.name) {
      return errorResult('fifa2026.predict.match.away_not_found', 'Failed to capture away team snapshot from current page');
    }

    var competitionUrl = asString(payload && payload.competition_url) || 'https://fbref.com/en/comps/1/World-Cup-Stats';
    var neutralSite = normalizeBoolean(payload && payload.neutral_site, true);
    var rankings = await fetchCompetitionRankings(competitionUrl, homeSnapshot, awaySnapshot);
    var prediction = buildPrediction(homeSnapshot, awaySnapshot, rankings.success ? rankings : null, competitionUrl, neutralSite);

    clearPredictHomeSnapshotCache();
    prediction.workflow_mode = 'sequential_navigation';

    return successData(prediction);
  }

  async function predictMatch(payload) {
    return errorResult(
      'fifa2026.predict.match.workflow_required',
      'predictMatch is disabled for direct call; use workflow sequence capturePredictHome -> predictMatchFromWorkflow'
    );
  }

  async function searchPlayer(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var name = asString(payload && payload.name);
    if (!name) {
      return errorResult('fifa2026.search.name_required', 'name is required');
    }

    var limit = normalizeLimit(payload && payload.limit, 10, 30);
    var players = parseSearchRows(limit);

    if (!players.length) {
      players = parseSearchAnchors(limit);
    }

    if (!players.length) {
      return errorResult('fifa2026.search.empty', 'No player matches were found');
    }

    return successData({
      query: name,
      items: players
    });
  }

  async function searchTeam(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var query = asString(payload && payload.name).toLowerCase();
    if (!query) {
      return errorResult('fifa2026.search.team.name_required', 'name is required');
    }

    var competitionUrl = asString(payload && payload.url) || 'https://fbref.com/en/comps/1/World-Cup-Stats';
    var teamLimit = normalizeLimit(payload && payload.limit, 32, 64);

    var parsed = parseCompetitionGroups(teamLimit);
    if (!parsed.teams.length) {
      return errorResult('fifa2026.search.team.empty', 'No World Cup team rows were found on the page');
    }

    var teams = parsed.teams.filter(function (team) {
      return asString(team.name).toLowerCase().indexOf(query) >= 0;
    });

    if (!teams.length) {
      return errorResult('fifa2026.search.team.not_found', 'No team matched the provided name');
    }

    var teamMap = {};
    for (var k = 0; k < teams.length; k += 1) {
      teamMap[teams[k].url] = true;
    }

    var groups = parsed.groups.map(function (group) {
      return {
        name: group.name,
        teams: (group.teams || []).filter(function (team) {
          return !!teamMap[team.url];
        })
      };
    }).filter(function (group) {
      return group.teams.length > 0;
    });

    return successData({
      query: query,
      url: competitionUrl,
      groups: groups,
      items: teams
    });
  }

  async function searchGroup(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var query = asString(payload && payload.query).toLowerCase();
    var hasQuery = !!query;

    var competitionUrl = asString(payload && payload.url) || 'https://fbref.com/en/comps/1/World-Cup-Stats';
    var teamLimit = normalizeLimit(payload && payload.limit, 64, 128);

    var parsed = parseCompetitionGroups(teamLimit);
    if (!parsed.groups.length) {
      return errorResult('fifa2026.search.group.empty', 'No groups were found on the page');
    }

    var groupItems = parsed.groups.map(function (group) {
      var teamUrls = {};
      for (var i = 0; i < group.teams.length; i += 1) {
        teamUrls[group.teams[i].url] = true;
      }

      var teamInfos = parsed.teams.filter(function (team) {
        return !!teamUrls[team.url];
      });

      return {
        name: group.name,
        countries: group.teams.map(function (team) { return team.name; }),
        teams: teamInfos
      };
    });

    if (hasQuery) {
      var tokens = query.split(/[\s,]+/).map(function (v) {
        return asString(v).toLowerCase();
      }).filter(function (v) {
        return !!v;
      });

      var groupLetterTokens = tokens.filter(function (token) {
        return /^[a-z]$/.test(token);
      });

      groupItems = groupItems.filter(function (group) {
        var groupName = asString(group.name).toLowerCase();
        var countries = (group.countries || []).map(function (country) {
          return asString(country).toLowerCase();
        });

        var matchedByGroupLetter = false;
        if (groupLetterTokens.length) {
          for (var i = 0; i < groupLetterTokens.length; i += 1) {
            if (groupName.indexOf('group ' + groupLetterTokens[i]) >= 0) {
              matchedByGroupLetter = true;
              break;
            }
          }
        }

        var matchedByText = false;
        if (!groupLetterTokens.length) {
          if (groupName.indexOf(query) >= 0) {
            matchedByText = true;
          } else {
            for (var j = 0; j < countries.length; j += 1) {
              if (countries[j].indexOf(query) >= 0) {
                matchedByText = true;
                break;
              }
            }
          }
        } else {
          for (var k = 0; k < countries.length; k += 1) {
            for (var n = 0; n < tokens.length; n += 1) {
              if (tokens[n].length > 1 && countries[k].indexOf(tokens[n]) >= 0) {
                matchedByText = true;
                break;
              }
            }
            if (matchedByText) {
              break;
            }
          }
        }

        return matchedByGroupLetter || matchedByText;
      });
    }

    if (hasQuery && !groupItems.length) {
      return errorResult('fifa2026.search.group.not_found', 'No group matched the provided query');
    }

    return successData({
      query: query,
      url: competitionUrl,
      items: groupItems
    });
  }

  async function getTeam(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var url = resolveTeamUrl(payload);
    if (!url) {
      return errorResult('fifa2026.get.team.url_required', 'url is required');
    }

    if (url.indexOf('/squads/') < 0) {
      return errorResult('fifa2026.get.team.invalid_url', 'url must be a fbref team squad URL');
    }

    var playerLimit = normalizeLimit(payload && payload.player_limit, 30, 60);
    var name = asString((document.querySelector('h1') || {}).textContent);
    var metaLines = parseMetaParagraphs();
    var players = parseTeamPlayersFromDocument(document, playerLimit);

    if (!name) {
      return errorResult('fifa2026.get.team.not_found', 'The current page is not a valid team page');
    }

    return successData({
      name: name,
      url: url,
      meta: metaLines,
      players: players
    });
  }

  async function getTeamStats(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var url = resolveTeamUrl(payload);
    if (!url) {
      return errorResult('fifa2026.stats.team.url_required', 'url is required');
    }

    if (url.indexOf('/squads/') < 0) {
      return errorResult('fifa2026.stats.team.invalid_url', 'url must be a fbref team squad URL');
    }

    var limit = normalizeLimit(payload && payload.limit, 10, 30);
    var matches = parseTeamMatchRows(limit);
    if (!matches.length) {
      return errorResult('fifa2026.stats.team.empty', 'No team match stats were found on this page');
    }

    return successData({
      team_url: url,
      limit: limit,
      items: matches
    });
  }

  async function getPlayer(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var url = resolvePlayerUrl(payload);
    if (!url) {
      return errorResult('fifa2026.get.url_required', 'url or id is required');
    }

    if (url.indexOf('/players/') < 0) {
      return errorResult('fifa2026.get.invalid_player_url', 'url must be a fbref player profile URL');
    }

    var name = asString((document.querySelector('h1') || {}).textContent);
    var metaLines = parseMetaParagraphs();
    var summary = parsePrimaryStatRow();

    if (!name) {
      return errorResult('fifa2026.get.player_not_found', 'The current page is not a valid player profile');
    }

    return successData({
      id: playerIdFromUrl(url),
      name: name,
      url: url,
      meta: metaLines,
      summary: summary
    });
  }

  async function getPlayerStats(payload) {
    if (isCloudflareChallengePage()) {
      return errorResult('fifa2026.cloudflare.blocked', 'fbref is blocked by Cloudflare challenge in current session');
    }

    var url = resolvePlayerUrl(payload);
    if (!url) {
      return errorResult('fifa2026.stats.url_required', 'url is required');
    }

    var limit = normalizeLimit(payload && payload.limit, 5, 10);
    var playerStats = {
      performance: {
        goals: '',
        assists: '',
        goals_pens: '',
        penalties_made: '',
        penalties_attempted: '',
        yellow_cards: '',
        red_cards: '',
        xg: '',
        npxg: '',
        xa: '',
        npxg_xa: ''
      },
      playing_time: {
        appearances: '',
        starts: '',
        minutes: '',
        minutes_90s: '',
        complete_games: '',
        substitute_appearances: '',
        subbed_in: '',
        subbed_out: '',
        minutes_per_game: '',
        minutes_per_start: '',
        minutes_per_90: ''
      },
      per_90_minutes: {
        goals: '',
        assists: '',
        goal_assists: '',
        goals_pens: '',
        xg: '',
        xa: '',
        npxg: '',
        npxg_xa: ''
      }
    };
    var player = parsePlayerContext(document, url);
    var profileResult = await fetchDocument(url);
    if (profileResult.success) {
      player = parsePlayerContext(profileResult.doc, profileResult.url);
      playerStats = parsePlayerSeasonStatsFromDocument(profileResult.doc);
    }
    var matches = parseRecentMatchRows(limit, document, player);
    var matchlogsUrl = asString(window.location.href);

    if (!matches.length) {
      var preferredSummaryUrl = pickPreferredPlayerMatchlogSummaryUrl(document);
      if (preferredSummaryUrl) {
        var fetched = await fetchDocument(preferredSummaryUrl);
        if (fetched.success) {
          player = parsePlayerContext(fetched.doc, url);
          matches = parseRecentMatchRows(limit, fetched.doc, player);
          matchlogsUrl = fetched.url;
        }
      }
    }

    if (!matches.length) {
      return errorResult('fifa2026.stats.empty', 'No match logs were found on this page', {
        player_url: url,
        page_url: asString(window.location.href)
      });
    }

    return successData({
      player_url: url,
      matchlogs_url: matchlogsUrl,
      player: {
        id: player.id,
        name: player.name,
        url: player.url,
        position: player.position,
        performance: playerStats.performance,
        playing_time: playerStats.playing_time,
        per_90_minutes: playerStats.per_90_minutes
      },
      limit: limit,
      items: matches
    });
  }

  window.__mediauseFifa2026 = {
    captureCompareTeamA: captureCompareTeamA,
    capturePredictHome: capturePredictHome,
    compareTeams: compareTeams,
    compareTeamsFromWorkflow: compareTeamsFromWorkflow,
    getPlayer: getPlayer,
    getTeam: getTeam,
    getPlayerStats: getPlayerStats,
    getTeamStats: getTeamStats,
    predictMatchFromWorkflow: predictMatchFromWorkflow,
    predictMatch: predictMatch,
    searchGroup: searchGroup,
    searchPlayer: searchPlayer,
    searchTeam: searchTeam
  };
})();
