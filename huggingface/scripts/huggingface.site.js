(function () {
  var helpers = window.__mediauseHuggingfaceHelpers || {};

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

  async function getTop(payload) {
    try {
      var period = helpers.normalizePeriod(payload && payload.period);
      var limit = helpers.normalizeLimit(payload && payload.limit, 20, 100);
      var all = helpers.normalizeBool(payload && payload.all, false);
      var date = helpers.normalizeString(payload && payload.date);

      if ((period === 'weekly' || period === 'monthly') && date) {
        return errorResult('huggingface.get.top.invalid_date', 'date is only supported when period=daily');
      }

      var rows = [];
      if (period === 'daily') {
        var url = '/api/daily_papers';
        if (date) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return errorResult('huggingface.get.top.invalid_date_format', 'date must be YYYY-MM-DD');
          }
          url += '?date=' + encodeURIComponent(date);
        }

        var dailyData = await helpers.fetchJson(url);
        var dailyRows = Array.isArray(dailyData) ? dailyData : [];
        rows = dailyRows.map(function (item) {
          return {
            id: helpers.normalizeString(item && item.paper && item.paper.id),
            title: helpers.normalizeString(item && item.title),
            upvotes: Number(item && item.paper && item.paper.upvotes) || 0,
            authors: helpers.formatAuthors(item && item.paper && item.paper.authors, 3),
            publishedAt: helpers.normalizeString(item && item.paper && item.paper.publishedAt).slice(0, 10),
            url: item && item.paper && item.paper.id ? 'https://huggingface.co/papers/' + item.paper.id : ''
          };
        });
      } else {
        var periodData = await helpers.fetchJson('/api/papers?period=' + encodeURIComponent(period));
        var periodRows = Array.isArray(periodData) ? periodData : [];
        rows = periodRows.map(function (item) {
          return {
            id: helpers.normalizeString(item && item.id),
            title: helpers.normalizeString(item && item.title),
            upvotes: Number(item && item.upvotes) || 0,
            authors: helpers.formatAuthors(item && item.authors, 3),
            publishedAt: helpers.normalizeString(item && item.publishedAt).slice(0, 10),
            url: item && item.id ? 'https://huggingface.co/papers/' + item.id : ''
          };
        });
      }

      rows.sort(function (a, b) {
        return (b.upvotes || 0) - (a.upvotes || 0);
      });

      var selected = all ? rows : rows.slice(0, limit);
      var items = selected.map(function (item, index) {
        return {
          rank: index + 1,
          id: item.id,
          title: item.title,
          upvotes: item.upvotes,
          authors: item.authors,
          publishedAt: item.publishedAt,
          url: item.url
        };
      });

      if (!items.length) {
        return errorResult('huggingface.get.top.empty', 'No Hugging Face papers found');
      }

      return successItems(items);
    } catch (error) {
      return errorResult('huggingface.get.top.failed', 'get top failed', String(error));
    }
  }

  async function getModels(payload) {
    try {
      var sort = helpers.normalizeSort(payload && payload.sort, helpers.SORT_OPTIONS || [], 'downloads');
      var limit = helpers.normalizeLimit(payload && payload.limit, 20, 100);
      var search = helpers.normalizeString(payload && payload.search);
      var pipeline = helpers.normalizeString(payload && payload.pipeline);

      var url = '/api/models?sort=' + encodeURIComponent(sort) + '&direction=-1&limit=' + encodeURIComponent(String(limit)) + '&full=true';
      if (search) {
        url += '&search=' + encodeURIComponent(search);
      }
      if (pipeline) {
        url += '&pipeline_tag=' + encodeURIComponent(pipeline);
      }

      var data = await helpers.fetchJson(url);
      var list = Array.isArray(data) ? data : [];
      if (!list.length) {
        return errorResult('huggingface.get.models.empty', 'No Hugging Face models found');
      }

      var items = list.slice(0, limit).map(function (item, index) {
        var mapped = helpers.mapModelLikeRecord(item, index + 1, 'model');
        return {
          rank: mapped.rank,
          id: mapped.id,
          author: mapped.author,
          pipelineTag: mapped.pipelineTag,
          downloads: mapped.downloads,
          likes: mapped.likes,
          tags: mapped.tags,
          lastModified: mapped.lastModified,
          url: mapped.url
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('huggingface.get.models.failed', 'get models failed', String(error));
    }
  }

  async function getDatasets(payload) {
    try {
      var sort = helpers.normalizeSort(payload && payload.sort, helpers.SORT_OPTIONS || [], 'downloads');
      var limit = helpers.normalizeLimit(payload && payload.limit, 20, 100);
      var search = helpers.normalizeString(payload && payload.search);

      var url = '/api/datasets?sort=' + encodeURIComponent(sort) + '&direction=-1&limit=' + encodeURIComponent(String(limit)) + '&full=true';
      if (search) {
        url += '&search=' + encodeURIComponent(search);
      }

      var data = await helpers.fetchJson(url);
      var list = Array.isArray(data) ? data : [];
      if (!list.length) {
        return errorResult('huggingface.get.datasets.empty', 'No Hugging Face datasets found');
      }

      var items = list.slice(0, limit).map(function (item, index) {
        var mapped = helpers.mapModelLikeRecord(item, index + 1, 'dataset');
        return {
          rank: mapped.rank,
          id: mapped.id,
          author: mapped.author,
          downloads: mapped.downloads,
          likes: mapped.likes,
          tags: mapped.tags,
          lastModified: mapped.lastModified,
          url: mapped.url
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('huggingface.get.datasets.failed', 'get datasets failed', String(error));
    }
  }

  async function getSpaces(payload) {
    try {
      var sort = helpers.normalizeSort(payload && payload.sort, helpers.SPACE_SORT_OPTIONS || [], 'likes');
      var limit = helpers.normalizeLimit(payload && payload.limit, 20, 100);
      var search = helpers.normalizeString(payload && payload.search);
      var sdk = helpers.normalizeString(payload && payload.sdk).toLowerCase();

      if (sdk && ['gradio', 'streamlit', 'docker', 'static'].indexOf(sdk) < 0) {
        return errorResult('huggingface.get.spaces.invalid_sdk', 'sdk must be one of gradio, streamlit, docker, static');
      }

      var url = '/api/spaces?sort=' + encodeURIComponent(sort) + '&direction=-1&limit=' + encodeURIComponent(String(limit)) + '&full=true';
      if (search) {
        url += '&search=' + encodeURIComponent(search);
      }
      if (sdk) {
        url += '&sdk=' + encodeURIComponent(sdk);
      }

      var data = await helpers.fetchJson(url);
      var list = Array.isArray(data) ? data : [];
      if (!list.length) {
        return errorResult('huggingface.get.spaces.empty', 'No Hugging Face spaces found');
      }

      var items = list.slice(0, limit).map(function (item, index) {
        var mapped = helpers.mapModelLikeRecord(item, index + 1, 'space');
        return {
          rank: mapped.rank,
          id: mapped.id,
          author: mapped.author,
          sdk: mapped.sdk,
          likes: mapped.likes,
          tags: mapped.tags,
          lastModified: mapped.lastModified,
          url: mapped.url
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('huggingface.get.spaces.failed', 'get spaces failed', String(error));
    }
  }

  async function getPaper(payload) {
    try {
      var id = helpers.normalizeString(payload && payload.id);
      if (!id) {
        return errorResult('huggingface.get.paper.id_required', 'id is required');
      }
      if (!helpers.isValidPaperId(id)) {
        return errorResult('huggingface.get.paper.invalid_id', 'id must be a valid arXiv id, e.g. 1706.03762');
      }

      var paper = await helpers.fetchJson('/api/papers/' + encodeURIComponent(id));
      if (!paper || typeof paper !== 'object' || !paper.id) {
        return errorResult('huggingface.get.paper.empty', 'No paper data found for the provided id');
      }

      var item = {
        id: helpers.normalizeString(paper.id),
        title: helpers.normalizeString(paper.title),
        authors: helpers.formatAuthors(paper.authors, 99),
        publishedAt: helpers.normalizeString(paper.publishedAt).slice(0, 10),
        upvotes: Number(paper.upvotes) || 0,
        aiKeywords: Array.isArray(paper.ai_keywords) ? paper.ai_keywords.join(', ') : '',
        summary: helpers.normalizeString(paper.summary),
        aiSummary: helpers.normalizeString(paper.ai_summary),
        url: 'https://huggingface.co/papers/' + helpers.normalizeString(paper.id)
      };

      return successItems([item]);
    } catch (error) {
      return errorResult('huggingface.get.paper.failed', 'get paper failed', String(error));
    }
  }

  window.__mediauseHuggingface = {
    accountHealth: accountHealth,
    getTop: getTop,
    getModels: getModels,
    getDatasets: getDatasets,
    getSpaces: getSpaces,
    getPaper: getPaper
  };
})();
