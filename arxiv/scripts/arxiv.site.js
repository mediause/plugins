(function () {
  var helpers = window.__mediauseArxivHelpers || {};

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

  function successItems(items) {
    if (typeof helpers.successItems === 'function') {
      return helpers.successItems(items);
    }

    return {
      success: true,
      data: {
        items: Array.isArray(items) ? items : []
      }
    };
  }

  function asString(value) {
    return String(value || '').trim();
  }

  async function searchPapers(payload) {
    try {
      var query = asString(payload && payload.query);
      if (!query) {
        return errorResult('arxiv.search.query_required', 'query is required');
      }

      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 10, 25, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var queryString =
        'search_query=' + encodeURIComponent('all:' + query) +
        '&max_results=' + encodeURIComponent(String(limitCheck.value)) +
        '&sortBy=relevance';

      var xml = await helpers.arxivFetch(queryString);
      var entries = helpers.parseEntries(xml);
      if (!entries.length) {
        return errorResult('arxiv.search.empty', 'No papers found. Try a different keyword.');
      }

      var items = entries.map(function (entry) {
        return {
          id: entry.id,
          title: entry.title,
          authors: entry.authors,
          published: entry.published,
          primary_category: entry.primary_category,
          url: entry.url
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('arxiv.search.failed', 'search papers failed', String(error));
    }
  }

  async function getPaper(payload) {
    try {
      var id = asString(payload && payload.id);
      if (!id) {
        return errorResult('arxiv.get.id_required', 'id is required');
      }

      var xml = await helpers.arxivFetch('id_list=' + encodeURIComponent(id));
      var entries = helpers.parseEntries(xml);
      if (!entries.length) {
        return errorResult('arxiv.get.not_found', 'Paper was not found. Check the arXiv ID format, e.g. 1706.03762.');
      }

      return successItems(entries.slice(0, 1));
    } catch (error) {
      return errorResult('arxiv.get.paper_failed', 'get paper failed', String(error));
    }
  }

  async function getRecent(payload) {
    try {
      var categoryCheck = helpers.normalizeCategory(payload && payload.category);
      if (!categoryCheck.ok) {
        return categoryCheck.error;
      }

      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 10, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var queryString =
        'search_query=' + encodeURIComponent('cat:' + categoryCheck.value) +
        '&max_results=' + encodeURIComponent(String(limitCheck.value)) +
        '&sortBy=submittedDate&sortOrder=descending';

      var xml = await helpers.arxivFetch(queryString);
      var entries = helpers.parseEntries(xml);
      if (!entries.length) {
        return errorResult('arxiv.get.recent_empty', 'No recent papers in this category. Check the category name.');
      }

      var items = entries.map(function (entry) {
        return {
          id: entry.id,
          title: entry.title,
          authors: entry.authors,
          published: entry.published,
          primary_category: entry.primary_category,
          url: entry.url
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('arxiv.get.recent_failed', 'get recent failed', String(error));
    }
  }

  async function userPapers(payload) {
    try {
      var author = asString(payload && payload.author);
      if (!author) {
        return errorResult('arxiv.user.author_required', 'author is required');
      }

      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var queryString =
        'search_query=' + encodeURIComponent('au:"' + author + '"') +
        '&max_results=' + encodeURIComponent(String(limitCheck.value)) +
        '&sortBy=submittedDate&sortOrder=descending';

      var xml = await helpers.arxivFetch(queryString);
      var entries = helpers.parseEntries(xml);
      if (!entries.length) {
        return errorResult('arxiv.user.empty', 'No papers found for this author. Try alternate spellings.');
      }

      var items = entries.map(function (entry) {
        return {
          id: entry.id,
          title: entry.title,
          authors: entry.authors,
          published: entry.published,
          primary_category: entry.primary_category,
          url: entry.url
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('arxiv.user.failed', 'list author papers failed', String(error));
    }
  }

  function accountHealth() {
    return helpers.successAccount({
      healthy: true,
      account: {
        id: 'guest',
        nick: 'guest',
        login: false
      }
    });
  }

  window.__mediauseArxiv = {
    accountHealth: accountHealth,
    searchPapers: searchPapers,
    getPaper: getPaper,
    getRecent: getRecent,
    userPapers: userPapers
  };
})();
