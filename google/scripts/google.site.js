(function () {
  var helpers = window.__mediauseGoogleHelpers;

  function err(code, message, details) {
    return helpers.asErr(code, message, details);
  }

  function ok(data) {
    return helpers.asOk(data);
  }

  function accountHealth() {
    return ok({
      healthy: true,
      account: {
        id: null,
        nick: null,
        login: false
      }
    });
  }

  function searchWeb(payload) {
    var safe = payload || {};
    var currentUrl = String(window.location && window.location.href || '');
    var bodyText = String(document.body && document.body.innerText || '');
    if (currentUrl.indexOf('/sorry/') !== -1 || /unusual traffic|not a robot|detected unusual traffic/i.test(bodyText)) {
      return err('google.search.blocked', 'Google blocked automated requests on this network', {
        url: currentUrl,
        title: String(document.title || ''),
        body_excerpt: bodyText.slice(0, 400),
        next: 'run CLI command "mediause account google --show" for opening the current page in a browser for manual verification and solving captcha if needed.'
      });
    }

    var limit = Number(safe.limit || 10);
    var results = helpers.extractGoogleSearchResults(limit);
    if (!Array.isArray(results) || !results.length) {
      return err('google.search.not_found', 'No search results found');
    }
    return ok({
      keyword: String(safe.keyword || ''),
      limit: Math.max(1, Math.min(limit || 10, 100)),
      results: results
    });
  }

  function searchSuggest(payload) {
    var safe = payload || {};
    var suggestions = helpers.parseSuggestFromBodyText();
    if (!suggestions.length) {
      return err('google.suggest.not_found', 'No suggestions found');
    }
    return ok({
      keyword: String(safe.keyword || ''),
      lang: String(safe.lang || 'zh-CN'),
      suggestions: suggestions.map(function (s) { return { suggestion: s }; })
    });
  }

  function getNews(payload) {
    var safe = payload || {};
    var limit = Math.max(1, Math.min(Number(safe.limit || 10), 100));
    var items = helpers.parseRssItemsFromDocument(['title', 'link', 'pubDate', 'source']);
    if (!items.length) {
      return err('google.news.not_found', 'No news articles found');
    }

    var rows = items.slice(0, limit).map(function (item) {
      var title = String(item.title || '');
      var source = String(item.source || '');
      if (!source) {
        var idx = title.lastIndexOf(' - ');
        if (idx !== -1) {
          source = title.slice(idx + 3);
          title = title.slice(0, idx);
        }
      }

      return {
        title: title,
        source: source,
        date: String(item.pubDate || ''),
        url: String(item.link || '')
      };
    });

    return ok({
      keyword: String(safe.keyword || ''),
      limit: limit,
      lang: String(safe.lang || 'en'),
      region: String(safe.region || 'US'),
      items: rows
    });
  }

  function getTrends(payload) {
    var safe = payload || {};
    var limit = Math.max(1, Math.min(Number(safe.limit || 20), 100));
    var items = helpers.parseRssItemsFromDocument(['title', 'pubDate', 'ht:approx_traffic']);
    if (!items.length) {
      return err('google.trends.not_found', 'No trending data found');
    }

    var rows = items.slice(0, limit).map(function (item) {
      return {
        title: String(item.title || ''),
        traffic: String(item['ht:approx_traffic'] || ''),
        date: String(item.pubDate || '')
      };
    });

    return ok({
      region: String(safe.region || 'US'),
      limit: limit,
      items: rows
    });
  }

  window.__mediauseGoogle = {
    accountHealth: accountHealth,
    searchWeb: searchWeb,
    searchSuggest: searchSuggest,
    getNews: getNews,
    getTrends: getTrends
  };
})();
