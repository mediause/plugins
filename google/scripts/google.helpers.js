(function () {
  function asErr(code, message, details) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  function asOk(data) {
    return {
      success: true,
      data: data
    };
  }

  function getRssFieldText(item, field) {
    var key = String(field || '').trim();
    if (!key) return '';

    var selector = key.replace(/:/g, '\\:');
    var node = item.querySelector(selector);
    if (!node) {
      var exactNodes = item.getElementsByTagName(key);
      if (exactNodes && exactNodes.length) {
        node = exactNodes[0];
      }
    }

    if (!node && key.indexOf(':') !== -1) {
      var local = key.split(':').pop();
      var localNodes = item.getElementsByTagName(local);
      if (localNodes && localNodes.length) {
        for (var i = 0; i < localNodes.length; i += 1) {
          var candidate = localNodes[i];
          if (String(candidate.localName || '').toLowerCase() === String(local).toLowerCase()) {
            node = candidate;
            break;
          }
        }
        if (!node) {
          node = localNodes[0];
        }
      }
    }

    return node ? String(node.textContent || '').trim() : '';
  }

  function parseRssItemsFromDocument(fields) {
    var items = Array.prototype.slice.call(document.querySelectorAll('item'));
    return items.map(function (item) {
      var record = {};
      fields.forEach(function (field) {
        record[field] = getRssFieldText(item, field);
      });
      return record;
    });
  }

  function parseSuggestFromBodyText() {
    var raw = String(document.body && document.body.innerText || '').trim();
    if (!raw) return [];
    try {
      var parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && Array.isArray(parsed[1])) {
        return parsed[1].map(function (v) { return String(v); });
      }
      return [];
    } catch (error) {
      return [];
    }
  }

  function normalizeGoogleResultUrl(href) {
    var raw = String(href || '').trim();
    if (!raw) return '';

    try {
      var parsed = new URL(raw, window.location.origin);
      if (parsed.pathname === '/url') {
        var q = parsed.searchParams.get('q') || parsed.searchParams.get('url') || '';
        if (/^https?:\/\//.test(q)) {
          return q;
        }
      }
      return parsed.href;
    } catch (error) {
      return raw;
    }
  }

  function extractGoogleSearchResults(limit) {
    var max = Math.max(1, Math.min(Number(limit) || 10, 100));
    var results = [];
    var seenUrls = {};
    var root = document.querySelector('#rso') || document;

    var featuredEl = root.querySelector('.xpdopen .hgKElc') || root.querySelector('.IZ6rdc');
    if (featuredEl) {
      var parentBlock = featuredEl.closest('[data-hveid]') || featuredEl.parentElement;
      var fLink = parentBlock ? parentBlock.querySelector('a[href]') : null;
      var fUrl = normalizeGoogleResultUrl(fLink ? fLink.href : '');
      if (fUrl) {
        seenUrls[fUrl] = true;
      }
      results.push({
        type: 'snippet',
        title: String(featuredEl.textContent || '').trim().slice(0, 200),
        url: fUrl,
        snippet: ''
      });
    }

    var allLinks = root.querySelectorAll('a');
    for (var i = 0; i < allLinks.length; i += 1) {
      if (results.length >= max) break;
      var link = allLinks[i];
      var h3 = link.querySelector('h3');
      if (!h3) continue;

      var href = normalizeGoogleResultUrl(link.href || '');
      if (!/^https?:\/\//.test(href)) continue;
      if (href.indexOf('google.com/search') !== -1) continue;
      if (href.indexOf('google.com/url?') !== -1) continue;
      if (seenUrls[href]) continue;
      seenUrls[href] = true;

      var container = link;
      for (var j = 0; j < 6; j += 1) {
        if (container.parentElement && container.parentElement !== root) {
          container = container.parentElement;
        }
        if (container.getAttribute && container.getAttribute('data-hveid')) break;
      }

      var snippetText = '';
      var titleText = String(h3.textContent || '').trim();
      var candidates = container.querySelectorAll('span, div');
      for (var k = 0; k < candidates.length; k += 1) {
        var el = candidates[k];
        if (el.querySelector('h3') || el.querySelector('a[href]')) continue;
        var text = String(el.textContent || '').trim();
        if (text.length < 40 || text.length > 500) continue;
        if (text === titleText) continue;
        if (text.indexOf('›') !== -1) continue;
        if (/https?:\/\//.test(text.slice(0, 60))) continue;
        snippetText = text;
        break;
      }

      results.push({
        type: 'result',
        title: titleText,
        url: href,
        snippet: snippetText.slice(0, 300)
      });
    }

    var paaContainers = root.querySelectorAll('[data-sgrd="true"]');
    for (var m = 0; m < paaContainers.length; m += 1) {
      if (results.length >= max) break;
      var questionEl = paaContainers[m].querySelector('span.CSkcDe');
      if (questionEl) {
        results.push({
          type: 'paa',
          title: String(questionEl.textContent || '').trim(),
          url: '',
          snippet: ''
        });
      }
    }

    return results.slice(0, max);
  }

  window.__mediauseGoogleHelpers = {
    asErr: asErr,
    asOk: asOk,
    parseRssItemsFromDocument: parseRssItemsFromDocument,
    parseSuggestFromBodyText: parseSuggestFromBodyText,
    extractGoogleSearchResults: extractGoogleSearchResults,
    normalizeGoogleResultUrl: normalizeGoogleResultUrl
  };
})();
