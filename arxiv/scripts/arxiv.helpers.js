(function () {
  var ARXIV_API_BASE = '/api/query';
  var ARXIV_CATEGORY_PATTERN = /^[a-z]+(?:-[a-z]+)*(?:\.[A-Za-z0-9]+(?:-[A-Za-z0-9]+)*)?$/;

  function successItems(items) {
    return {
      success: true,
      data: {
        items: Array.isArray(items) ? items : []
      }
    };
  }

  function successAccount(data) {
    return {
      success: true,
      data: data || {
        healthy: true,
        account: {
          id: 'guest',
          nick: 'guest',
          login: false
        }
      }
    };
  }

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

  function normalizePositiveInt(value, fallbackValue, maxValue, fieldName) {
    var parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0 || Math.floor(parsed) !== parsed) {
      parsed = fallbackValue;
    }
    if (parsed > maxValue) {
      return {
        ok: false,
        error: errorResult(
          'arxiv.invalid_argument',
          String(fieldName || 'limit') + ' must be <= ' + String(maxValue)
        )
      };
    }

    return {
      ok: true,
      value: parsed
    };
  }

  function normalizeCategory(value) {
    var category = String(value || '').trim();
    if (!ARXIV_CATEGORY_PATTERN.test(category)) {
      return {
        ok: false,
        error: errorResult(
          'arxiv.invalid_category',
          'Invalid arXiv category. Examples: cs.CL, cs.LG, math.PR, q-bio.NC'
        )
      };
    }

    return {
      ok: true,
      value: category
    };
  }

  async function arxivFetch(queryString) {
    var url = ARXIV_API_BASE + '?' + queryString;
    var response = await fetch(url);
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for arXiv API');
    }
    return response.text();
  }

  function decodeEntities(text) {
    return String(text || '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&apos;/g, "'")
      .replace(/&#39;/g, "'");
  }

  function extract(xml, tag) {
    var matcher = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>');
    var match = String(xml || '').match(matcher);
    return match ? String(match[1]).trim() : '';
  }

  function extractAll(xml, tag) {
    var matcher = new RegExp('<' + tag + '[^>]*>([\\s\\S]*?)<\\/' + tag + '>', 'g');
    var out = [];
    var match = null;
    while ((match = matcher.exec(String(xml || ''))) !== null) {
      out.push(String(match[1]).trim());
    }
    return out;
  }

  function extractAttr(xml, tag, attr) {
    var matcher = new RegExp('<' + tag + '\\b[^>]*?\\b' + attr + '="([^"]*)"');
    var match = String(xml || '').match(matcher);
    return match ? String(match[1]) : '';
  }

  function extractAllAttr(xml, tag, attr) {
    var matcher = new RegExp('<' + tag + '\\b[^>]*?\\b' + attr + '="([^"]*)"', 'g');
    var out = [];
    var match = null;
    while ((match = matcher.exec(String(xml || ''))) !== null) {
      out.push(String(match[1]));
    }
    return out;
  }

  function findLinkHref(xml, rel) {
    var linkMatcher = /<link\b([^>]*)\/?\s*>/g;
    var match = null;
    while ((match = linkMatcher.exec(String(xml || ''))) !== null) {
      var attrs = String(match[1] || '');
      if (new RegExp('\\brel="' + String(rel || '') + '"').test(attrs)) {
        var hrefMatch = attrs.match(/\bhref="([^"]*)"/);
        if (hrefMatch && hrefMatch[1]) {
          return String(hrefMatch[1]);
        }
      }
    }
    return '';
  }

  function parseEntries(xml) {
    var entryMatcher = /<entry>([\s\S]*?)<\/entry>/g;
    var entries = [];
    var match = null;

    while ((match = entryMatcher.exec(String(xml || ''))) !== null) {
      var entryXml = String(match[1] || '');
      var rawId = extract(entryXml, 'id');
      var arxivId = rawId
        .replace(/^https?:\/\/arxiv\.org\/abs\//, '')
        .replace(/v\d+$/, '');
      var pdf = findLinkHref(entryXml, 'related') || 'https://arxiv.org/pdf/' + arxivId;

      entries.push({
        id: arxivId,
        title: decodeEntities(extract(entryXml, 'title').replace(/\s+/g, ' ')),
        authors: decodeEntities(extractAll(entryXml, 'name').join(', ')),
        abstract: decodeEntities(extract(entryXml, 'summary').replace(/\s+/g, ' ')),
        published: extract(entryXml, 'published').slice(0, 10),
        updated: extract(entryXml, 'updated').slice(0, 10),
        primary_category: extractAttr(entryXml, 'arxiv:primary_category', 'term'),
        categories: extractAllAttr(entryXml, 'category', 'term').join(', '),
        comment: decodeEntities(extract(entryXml, 'arxiv:comment').replace(/\s+/g, ' ')),
        pdf: pdf,
        url: 'https://arxiv.org/abs/' + arxivId
      });
    }

    return entries;
  }

  window.__mediauseArxivHelpers = {
    successItems: successItems,
    successAccount: successAccount,
    errorResult: errorResult,
    normalizePositiveInt: normalizePositiveInt,
    normalizeCategory: normalizeCategory,
    arxivFetch: arxivFetch,
    parseEntries: parseEntries
  };
})();
