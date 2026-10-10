(function () {
  function errorResult(code, message, details) {
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
    return {
      success: true,
      data: {
        items: Array.isArray(items) ? items : []
      }
    };
  }

  function sanitizeLimit(value, fallback) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      return fallback;
    }
    return Math.floor(n);
  }

  function endpointForKind(kind) {
    var mapping = {
      top: 'topstories',
      best: 'beststories',
      ask: 'askstories',
      new: 'newstories',
      show: 'showstories',
      jobs: 'jobstories'
    };
    return mapping[kind] || null;
  }

  async function fetchJson(url) {
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + url);
    }
    return response.json();
  }

  function mapStoryRow(item, rank, jobsOnly) {
    if (jobsOnly) {
      return {
        rank: rank,
        id: item.id,
        title: item.title || '',
        author: item.by || '',
        url: item.url || ''
      };
    }

    return {
      rank: rank,
      id: item.id,
      title: item.title || '',
      score: item.score || 0,
      author: item.by || '',
      comments: item.descendants || 0,
      url: item.url || ''
    };
  }

  function htmlToText(html) {
    if (!html) {
      return '';
    }

    return String(html)
      .replace(/<p>/gi, '\n\n')
      .replace(/<\/p>/gi, '')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<i>(.*?)<\/i>/gi, '$1')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '$2 ($1)')
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, '\n$1\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&#x27;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&nbsp;/g, ' ')
      .replace(/&#x2F;/g, '/')
      .trim();
  }

  function dateFromUnix(ts) {
    if (!Number.isFinite(Number(ts))) {
      return '';
    }
    return new Date(Number(ts) * 1000).toISOString().slice(0, 10);
  }

  window.__mediauseHackernewsHelpers = {
    errorResult: errorResult,
    successItems: successItems,
    sanitizeLimit: sanitizeLimit,
    endpointForKind: endpointForKind,
    fetchJson: fetchJson,
    mapStoryRow: mapStoryRow,
    htmlToText: htmlToText,
    dateFromUnix: dateFromUnix
  };
})();
