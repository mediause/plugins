(function () {
  var helpers = window.__mediauseProducthuntHelpers || {};

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

  async function fetchFeed(category) {
    var query = helpers.normalizeString(category);
    var url = query
      ? 'https://www.producthunt.com/feed?category=' + encodeURIComponent(query)
      : 'https://www.producthunt.com/feed';
    var xml = await helpers.fetchText(url);
    return helpers.parseFeed(xml);
  }

  async function getPosts(payload) {
    try {
      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var category = helpers.normalizeString(payload && payload.category);
      var posts = await fetchFeed(category);
      return successItems(posts.slice(0, limitCheck.value));
    } catch (error) {
      return errorResult('producthunt.get.posts.failed', 'get posts failed', String(error));
    }
  }

  async function getToday(payload) {
    try {
      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var posts = await fetchFeed('');
      if (!posts.length) {
        return successItems([]);
      }

      var latestDate = posts.map(function (post) { return post.date; }).sort().reverse()[0];
      var filtered = posts.filter(function (post) { return post.date === latestDate; });

      var items = filtered.slice(0, limitCheck.value).map(function (post, index) {
        return {
          rank: index + 1,
          name: post.name,
          tagline: post.tagline,
          author: post.author,
          url: post.url
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('producthunt.get.today.failed', 'get today failed', String(error));
    }
  }

  async function getHot(payload) {
    try {
      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var seen = {};
      var cards = Array.prototype.slice.call(document.querySelectorAll('a[href^="/products/"]')).filter(function (el) {
        var href = el.getAttribute('href') || '';
        var text = helpers.normalizeString(el.textContent);
        return href && href.indexOf('/reviews') < 0 && text.length > 0 && text.length < 120;
      });

      var rows = [];

      cards.forEach(function (cardLink) {
        var href = cardLink.getAttribute('href') || '';
        if (!href || seen[href]) {
          return;
        }

        var card = cardLink;
        var node = cardLink.parentElement;
        for (var i = 0; i < 6 && node; i += 1) {
          var hasReviewLink = !!node.querySelector('a[href="' + href + '/reviews"]');
          var hasNumericNode = Array.prototype.slice.call(node.querySelectorAll('button, [role="button"], p, span, div')).some(function (el) {
            return /^\d+$/.test(helpers.normalizeString(el.textContent));
          });
          if (hasReviewLink || hasNumericNode) {
            card = node;
            break;
          }
          node = node.parentElement;
        }

        var rawName = helpers.normalizeString(cardLink.textContent)
          .replace(/^\d+\.\s*/, '')
          .replace(/\s*Launched\s+this\s+(month|week|year|day)\s*/gi, '')
          .replace(/\s*Featured\s*/gi, '')
          .trim();

        if (!rawName) {
          return;
        }

        var voteCandidates = Array.prototype.slice.call(card.querySelectorAll('button, [role="button"], a, p, span, div'))
          .map(function (el) {
            var reviewLink = el.closest ? el.closest('a[href="' + href + '/reviews"]') : null;
            return {
              text: helpers.normalizeString(el.textContent),
              tagName: el.tagName,
              className: el.className || '',
              role: el.getAttribute ? (el.getAttribute('role') || '') : '',
              inButton: !!(el.closest && el.closest('button, [role="button"]')),
              inReviewLink: !!reviewLink
            };
          })
          .filter(function (candidate) {
            return /^\d+$/.test(candidate.text);
          });

        var votes = helpers.pickVoteCount(voteCandidates);
        if (!votes) {
          return;
        }

        seen[href] = true;
        rows.push({
          name: rawName,
          votes: votes,
          url: 'https://www.producthunt.com' + href
        });
      });

      rows.sort(function (a, b) {
        return Number(b.votes) - Number(a.votes);
      });

      var items = rows.slice(0, limitCheck.value).map(function (row, index) {
        return {
          rank: index + 1,
          name: row.name,
          votes: row.votes,
          url: row.url
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('producthunt.get.hot.failed', 'get hot failed', String(error));
    }
  }

  function collectJsonLdObjects() {
    var objects = [];
    var scripts = Array.prototype.slice.call(document.querySelectorAll('script[type="application/ld+json"]'));

    scripts.forEach(function (script) {
      var raw = helpers.normalizeString(script && script.textContent);
      if (!raw) {
        return;
      }

      try {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          parsed.forEach(function (item) {
            if (item && typeof item === 'object') {
              objects.push(item);
            }
          });
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray(parsed['@graph'])) {
            parsed['@graph'].forEach(function (item) {
              if (item && typeof item === 'object') {
                objects.push(item);
              }
            });
          } else {
            objects.push(parsed);
          }
        }
      } catch (_error) {
      }
    });

    return objects;
  }

  function extractMetaInfo() {
    function readMeta(property) {
      var selector = 'meta[property="' + property + '"], meta[name="' + property + '"]';
      var node = document.querySelector(selector);
      return helpers.normalizeString(node && node.getAttribute('content'));
    }

    return {
      title: helpers.normalizeString(document.title),
      description: readMeta('description') || readMeta('og:description') || readMeta('twitter:description'),
      image: readMeta('og:image') || readMeta('twitter:image'),
      type: readMeta('og:type'),
      siteName: readMeta('og:site_name'),
      canonical: helpers.normalizeString((document.querySelector('link[rel="canonical"]') || {}).href || ''),
      url: readMeta('og:url') || window.location.href
    };
  }

  function normalizeDetailUrl(url) {
    var value = helpers.normalizeString(url);
    if (!value) {
      return '';
    }

    if (value.indexOf('http://') === 0 || value.indexOf('https://') === 0) {
      return value;
    }

    if (value.indexOf('/') === 0) {
      return 'https://www.producthunt.com' + value;
    }

    return 'https://www.producthunt.com/products/' + encodeURIComponent(value);
  }

  async function getDetail(payload) {
    try {
      var url = normalizeDetailUrl(payload && payload.url);
      if (!url) {
        return errorResult('producthunt.get.detail.url_required', 'url is required');
      }

      var commentsLimitCheck = helpers.normalizePositiveInt(payload && payload.comments_limit, 20, 100, 'comments_limit');
      if (!commentsLimitCheck.ok) {
        return commentsLimitCheck.error;
      }

      if (window.location.href.indexOf(url) !== 0) {
        return errorResult('producthunt.get.detail.page_mismatch', 'current page does not match the requested url', {
          requested: url,
          current: window.location.href
        });
      }

      var meta = extractMetaInfo();
      var jsonLdObjects = collectJsonLdObjects();

      var challengeSignal = (meta.title + ' ' + (meta.description || '')).toLowerCase();
      if (challengeSignal.indexOf('just a moment') >= 0 || challengeSignal.indexOf('security verification') >= 0 || challengeSignal.indexOf('cloudflare') >= 0) {
        return errorResult('producthunt.get.detail.blocked', 'page is blocked by anti-bot challenge', {
          requested: url,
          currentTitle: meta.title
        });
      }

      var h1 = helpers.normalizeString((document.querySelector('h1') || {}).textContent || '');
      var h2 = helpers.normalizeString((document.querySelector('h2') || {}).textContent || '');
      var tagline = h2;

      var tagNodes = Array.prototype.slice.call(document.querySelectorAll('a[href*="/topics/"]'));
      var tagsSeen = {};
      var tags = [];
      tagNodes.forEach(function (node) {
        var text = helpers.normalizeString(node && node.textContent);
        if (!text || tagsSeen[text.toLowerCase()]) {
          return;
        }
        tagsSeen[text.toLowerCase()] = true;
        tags.push(text);
      });

      var companyWebsite = '';
      var links = Array.prototype.slice.call(document.querySelectorAll('a[href^="http"]'));
      for (var i = 0; i < links.length; i += 1) {
        var href = helpers.normalizeString(links[i].getAttribute('href'));
        if (!href) {
          continue;
        }
        if (href.indexOf('producthunt.com') >= 0 || href.indexOf('twitter.com') >= 0 || href.indexOf('x.com') >= 0) {
          continue;
        }
        companyWebsite = href;
        break;
      }

      var teamSeen = {};
      var team = [];
      Array.prototype.slice.call(document.querySelectorAll('a[href^="/@"]')).forEach(function (node) {
        var name = helpers.normalizeString(node && node.textContent);
        var profile = helpers.normalizeString((node && node.href) || '');
        if (!name || !profile) {
          return;
        }
        var key = profile.toLowerCase();
        if (teamSeen[key]) {
          return;
        }
        teamSeen[key] = true;
        team.push({
          name: name,
          profile: profile
        });
      });

      var comments = [];
      var commentNodes = Array.prototype.slice.call(document.querySelectorAll('[data-test*="comment"], [id*="comment"], article'));
      for (var j = 0; j < commentNodes.length && comments.length < commentsLimitCheck.value; j += 1) {
        var node = commentNodes[j];
        var textNode = node.querySelector('p') || node;
        var text = helpers.normalizeString(textNode && textNode.textContent);
        if (!text || text.length < 4) {
          continue;
        }

        var authorNode = node.querySelector('a[href^="/@"]');
        var author = helpers.normalizeString(authorNode && authorNode.textContent);
        comments.push({
          rank: comments.length + 1,
          author: author,
          text: text.slice(0, 1000)
        });
      }

      var description = meta.description;
      if (!description) {
        var paragraph = document.querySelector('main p') || document.querySelector('p');
        description = helpers.normalizeString(paragraph && paragraph.textContent);
      }

      var company = {
        name: '',
        website: companyWebsite
      };

      for (var k = 0; k < jsonLdObjects.length; k += 1) {
        var item = jsonLdObjects[k] || {};
        var type = helpers.normalizeString(item['@type']).toLowerCase();
        if ((type === 'organization' || type === 'corporation') && !company.name) {
          company.name = helpers.normalizeString(item.name);
          if (!company.website) {
            company.website = helpers.normalizeString(item.url);
          }
        }
        if ((type === 'product' || type === 'softwareapplication') && !description) {
          description = helpers.normalizeString(item.description);
        }
      }

      var detail = {
        url: url,
        product: {
          name: h1,
          tagline: tagline,
          description: description
        },
        company: company,
        team: team,
        tags: tags,
        comments: comments,
        meta: meta,
        jsonLd: jsonLdObjects
      };

      return successItems([detail]);
    } catch (error) {
      return errorResult('producthunt.get.detail.failed', 'get detail failed', String(error));
    }
  }

  async function searchBrowse(payload) {
    try {
      var category = helpers.normalizeString(payload && payload.category).toLowerCase();
      if (!category) {
        return errorResult('producthunt.search.browse.category_required', 'category is required');
      }

      var limitCheck = helpers.normalizePositiveInt(payload && payload.limit, 20, 50, 'limit');
      if (!limitCheck.ok) {
        return limitCheck.error;
      }

      var seen = {};
      var cardLinks = Array.prototype.slice.call(document.querySelectorAll('a[href^="/products/"]')).filter(function (el) {
        var href = el.getAttribute('href') || '';
        var className = el.className || '';
        return className.indexOf('flex-col') >= 0 && href.indexOf('/reviews') < 0;
      });

      var items = [];

      cardLinks.forEach(function (cardLink) {
        if (items.length >= limitCheck.value) {
          return;
        }

        var href = cardLink.getAttribute('href') || '';
        if (!href || seen[href]) {
          return;
        }

        var nameDiv = cardLink.querySelector('div');
        var rawName = helpers.normalizeString(nameDiv && nameDiv.textContent)
          .replace(/\s*Launched\s+this\s+(month|week|year|day)\s*/gi, '')
          .replace(/\s*Featured\s*/gi, '')
          .trim();

        if (!rawName) {
          return;
        }

        var taglineEl = cardLink.querySelector('span.text-secondary, span[class*="text-secondary"]');
        var tagline = helpers.normalizeString(taglineEl && taglineEl.textContent).slice(0, 120);

        var reviews = '0';
        var container = cardLink.parentElement;
        for (var i = 0; i < 5 && container; i += 1) {
          var reviewLink = container.querySelector('a[href="' + href + '/reviews"]');
          if (reviewLink) {
            reviews = helpers.normalizeString(reviewLink.textContent).replace(/\s*reviews?\s*/i, '').trim() || '0';
            break;
          }
          container = container.parentElement;
        }

        seen[href] = true;
        items.push({
          rank: items.length + 1,
          name: rawName,
          tagline: tagline,
          reviews: reviews,
          url: 'https://www.producthunt.com' + href
        });
      });

      return successItems(items);
    } catch (error) {
      return errorResult('producthunt.search.browse.failed', 'search browse failed', String(error));
    }
  }

  window.__mediauseProducthunt = {
    getPosts: getPosts,
    getToday: getToday,
    getHot: getHot,
    getDetail: getDetail,
    searchBrowse: searchBrowse
  };
})();
