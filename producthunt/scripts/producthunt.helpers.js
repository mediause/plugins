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

  function normalizeString(value) {
    return String(value || '').trim();
  }

  function normalizePositiveInt(value, fallback, max, fieldName) {
    var raw = normalizeString(value);
    if (!raw) {
      return { ok: true, value: fallback };
    }

    var parsed = Number(raw);
    if (!Number.isFinite(parsed) || parsed <= 0 || Math.floor(parsed) !== parsed) {
      return {
        ok: false,
        error: errorResult('producthunt.validation.invalid_' + fieldName, fieldName + ' must be a positive integer')
      };
    }

    return { ok: true, value: Math.min(parsed, max) };
  }

  async function fetchText(url) {
    var response = await fetch(url, {
      method: 'GET',
      headers: {
        Accept: 'application/atom+xml,text/xml,application/xml,text/plain,*/*'
      }
    });

    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + url);
    }

    return response.text();
  }

  function decodeHtml(value) {
    return String(value || '')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"');
  }

  function parseFeed(xml) {
    var posts = [];
    var entryRegex = /<entry>([\s\S]*?)<\/entry>/g;
    var match;
    var rank = 1;

    while ((match = entryRegex.exec(String(xml || '')))) {
      var block = match[1] || '';
      var titleMatch = block.match(/<title>([\s\S]*?)<\/title>/);
      var authorMatch = block.match(/<name>([\s\S]*?)<\/name>/);
      var publishedMatch = block.match(/<published>(.*?)<\/published>/);
      var linkMatch = block.match(/<link[^>]*href="([^"]+)"/);
      var contentMatch = block.match(/<content[^>]*>([\s\S]*?)<\/content>/);

      var name = normalizeString(titleMatch ? titleMatch[1] : '');
      if (!name) {
        continue;
      }

      var contentDecoded = decodeHtml(contentMatch ? contentMatch[1] : '');
      var tagline = contentDecoded
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .replace(/\s*Discussion\s*\|?\s*/gi, '')
        .replace(/\s*\|?\s*Link\s*$/gi, '')
        .trim()
        .slice(0, 120);

      var date = normalizeString(publishedMatch ? publishedMatch[1] : '').slice(0, 10);

      posts.push({
        rank: rank,
        name: name,
        tagline: tagline,
        author: normalizeString(authorMatch ? authorMatch[1] : ''),
        date: date,
        url: normalizeString(linkMatch ? linkMatch[1] : '')
      });

      rank += 1;
    }

    return posts;
  }

  function pickVoteCount(candidates) {
    var scored = (Array.isArray(candidates) ? candidates : [])
      .map(function (candidate) {
        var text = normalizeString(candidate && candidate.text);
        if (!/^\d+$/.test(text)) {
          return null;
        }

        if (candidate && candidate.inReviewLink) {
          return null;
        }

        var value = Number(text);
        if (!Number.isFinite(value) || value <= 0) {
          return null;
        }

        var signal = ((candidate && candidate.tagName) || '') + ' ' + ((candidate && candidate.className) || '') + ' ' + ((candidate && candidate.role) || '');
        var lowerSignal = signal.toLowerCase();
        var score = 0;

        if (candidate && candidate.inButton) {
          score += 4;
        }
        if (lowerSignal.indexOf('vote') >= 0 || lowerSignal.indexOf('upvote') >= 0) {
          score += 3;
        }
        if (lowerSignal.indexOf('button') >= 0) {
          score += 1;
        }

        return {
          text: text,
          score: score,
          value: value
        };
      })
      .filter(Boolean)
      .sort(function (a, b) {
        if (b.score !== a.score) {
          return b.score - a.score;
        }
        if (b.value !== a.value) {
          return b.value - a.value;
        }
        return String(a.text).localeCompare(String(b.text));
      });

    return scored.length ? scored[0].text : '';
  }

  window.__mediauseProducthuntHelpers = {
    errorResult: errorResult,
    successItems: successItems,
    normalizeString: normalizeString,
    normalizePositiveInt: normalizePositiveInt,
    fetchText: fetchText,
    parseFeed: parseFeed,
    pickVoteCount: pickVoteCount
  };
})();
