(function () {
  var helpers = window.__mediauseHackernewsHelpers || {};

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

  function parseRank(raw) {
    var text = String(raw || '').trim().replace(/\.$/, '');
    var rank = Number(text);
    return Number.isFinite(rank) ? rank : 0;
  }

  function parseCommentCount(text) {
    var raw = String(text || '');
    var match = raw.match(/(\d+)\s+comment/);
    if (!match) {
      return 0;
    }
    return Number(match[1]) || 0;
  }

  function parseStoryRows(limit, jobsOnly) {
    var rows = Array.prototype.slice.call(document.querySelectorAll('tr.athing'));
    var items = [];

    for (var i = 0; i < rows.length; i += 1) {
      if (items.length >= limit) {
        break;
      }

      var row = rows[i];
      var titleAnchor = row.querySelector('.titleline a') || row.querySelector('.title a');
      if (!titleAnchor) {
        continue;
      }

      var id = row.getAttribute('id') || '';
      var rankText = row.querySelector('.rank') ? row.querySelector('.rank').textContent : '';
      var rank = parseRank(rankText) || (items.length + 1);
      var sublineRow = row.nextElementSibling;
      var subline = sublineRow ? sublineRow.querySelector('.subline') : null;
      var author = subline && subline.querySelector('.hnuser') ? subline.querySelector('.hnuser').textContent.trim() : '';

      if (jobsOnly) {
        items.push({
          rank: rank,
          id: id,
          title: titleAnchor.textContent ? titleAnchor.textContent.trim() : '',
          author: author,
          url: titleAnchor.href || ''
        });
        continue;
      }

      var scoreText = subline && subline.querySelector('.score') ? subline.querySelector('.score').textContent : '';
      var scoreMatch = String(scoreText || '').match(/(\d+)/);
      var score = scoreMatch ? Number(scoreMatch[1]) : 0;
      var links = subline ? subline.querySelectorAll('a') : [];
      var commentsText = links.length > 0 ? links[links.length - 1].textContent : '';
      var comments = parseCommentCount(commentsText);

      items.push({
        rank: rank,
        id: id,
        title: titleAnchor.textContent ? titleAnchor.textContent.trim() : '',
        score: score,
        author: author,
        comments: comments,
        url: titleAnchor.href || ''
      });
    }

    return items;
  }

  async function listStories(kind, payload) {
    try {
      var limit = helpers.sanitizeLimit(payload && payload.limit, 20);
      var jobsOnly = kind === 'jobs';
      return successItems(parseStoryRows(limit, jobsOnly));
    } catch (error) {
      return errorResult('hackernews.get.failed', 'get ' + kind + ' failed', String(error));
    }
  }

  async function searchStories(payload) {
    try {
      var query = String((payload && payload.query) || '').trim();
      if (!query) {
        return errorResult('hackernews.search.query_required', 'query is required');
      }

      var limit = helpers.sanitizeLimit(payload && payload.limit, 20);
      var sort = String((payload && payload.sort) || 'relevance').toLowerCase();
      var endpoint = sort === 'date' ? 'search_by_date' : 'search';
      var url =
        '/api/v1/' + endpoint +
        '?query=' + encodeURIComponent(query) +
        '&tags=story' +
        '&hitsPerPage=' + encodeURIComponent(String(limit));

      var data = await helpers.fetchJson(url);
      var hits = Array.isArray(data && data.hits) ? data.hits : [];

      var items = hits.slice(0, limit).map(function (item, index) {
        return {
          rank: index + 1,
          id: item.objectID || '',
          title: item.title || '',
          score: item.points || 0,
          author: item.author || '',
          comments: item.num_comments || 0,
          url: item.url || ''
        };
      });

      return successItems(items);
    } catch (error) {
      return errorResult('hackernews.search.failed', 'search stories failed', String(error));
    }
  }

  async function userProfile(payload) {
    try {
      var username = String((payload && payload.username) || '').trim();
      if (!username) {
        return errorResult('hackernews.user.username_required', 'username is required');
      }

      var profileTable = document.querySelector('table') || null;
      if (!profileTable) {
        return successItems([]);
      }

      var valueByLabel = {};
      var rows = profileTable.querySelectorAll('tr');
      for (var i = 0; i < rows.length; i += 1) {
        var tds = rows[i].querySelectorAll('td');
        if (tds.length < 2) {
          continue;
        }
        var label = String(tds[0].textContent || '').trim().toLowerCase().replace(/:$/, '');
        valueByLabel[label] = tds[1];
      }

      var userCell = valueByLabel.user;
      if (!userCell) {
        return successItems([]);
      }

      var karmaCell = valueByLabel.karma;
      var createdCell = valueByLabel.created;
      var aboutCell = valueByLabel.about;

      return successItems([{
        username: String(userCell.textContent || '').trim() || username,
        karma: Number(String(karmaCell ? karmaCell.textContent : '').trim()) || 0,
        created: String(createdCell ? createdCell.textContent : '').trim(),
        about: helpers.htmlToText(aboutCell ? aboutCell.innerHTML : '')
      }]);
    } catch (error) {
      return errorResult('hackernews.user.profile_failed', 'user profile failed', String(error));
    }
  }

  function htmlToText(html) {
    if (!html) return '';
    try {
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
    } catch (e) {
      return '';
    }
  }

  function indentLines(text, depth) {
    if (depth === 0) return text;
    var indent = '  '.repeat(depth);
    var prefix = indent + '> ';
    return text.split('\n').map(function (line) {
      return prefix + line;
    }).join('\n');
  }

  // Firebase API base URL for HackerNews
  var HN_ITEM_BASE = 'https://hacker-news.firebaseio.com/v0/item';

  async function fetchItem(id) {
    try {
      var response = await fetch(HN_ITEM_BASE + '/' + id + '.json');
      if (!response.ok) {
        return null;
      }
      return response.json();
    } catch (e) {
      return null;
    }
  }

  function moreRepliesIndent(depth) {
    return '  '.repeat(depth + 1);
  }

  async function readItem(payload) {
    var rows = [];

    try {
      var id = String((payload && payload.id) || '').trim();
      if (!/^\d+$/.test(id)) {
        return errorResult('hackernews.read.invalid_id', 'id must be a numeric string');
      }
    } catch (e) {
      return errorResult('hackernews.read.invalid_id', 'id validation failed');
    }

    var limit = 25;
    var maxDepth = 2;
    var maxReplies = 5;
    var maxLength = 2000;

    try {
      limit = helpers.sanitizeLimit(payload && payload.limit, 25);
      maxDepth = helpers.sanitizeLimit(payload && payload.depth, 2);
      maxReplies = helpers.sanitizeLimit(payload && payload.replies, 5);
      maxLength = helpers.sanitizeLimit(payload && payload.max_length, 2000);
      if (maxLength < 100) {
        maxLength = 100;
      }
    } catch (e) {
      // Use defaults
    }

    // Get story: first try to parse from current page (already at Firebase JSON)
    var story = null;
    try {
      var pageContent = document.body.textContent;
      if (pageContent) {
        story = JSON.parse(pageContent);
      }
    } catch (e) {
      // Not JSON page, fetch from API
    }

    // If not on Firebase page, fetch from API
    if (!story) {
      story = await fetchItem(id);
    }

    if (!story || story.deleted || story.dead) {
      return errorResult('hackernews.read.story_not_found', 'story not found, deleted, or dead');
    }

    // Build story header row
    try {
      var storyBodyRaw = htmlToText(story.text || '');
      var storyBody = storyBodyRaw.length > maxLength
        ? storyBodyRaw.slice(0, maxLength) + '\n... [truncated]'
        : storyBodyRaw;

      var storyParts = [story.title || ''];
      if (storyBody) {
        storyParts.push('\n' + storyBody);
      }
      if (story.url) {
        storyParts.push('\n' + story.url);
      }

      rows.push({
        type: 'POST',
        author: story.by || '[deleted]',
        score: story.score || 0,
        text: storyParts.join('').trim()
      });
    } catch (e) {
      return errorResult('hackernews.read.story_parse_failed', 'failed to parse story');
    }

    // Recursive function to walk comment tree
    async function walkComment(node, depth) {
      if (!node || node.deleted || node.dead || node.type !== 'comment') {
        return;
      }

      var bodyText = htmlToText(node.text || '');
      var truncated = bodyText.length > maxLength
        ? bodyText.slice(0, maxLength) + '...'
        : bodyText;

      rows.push({
        type: depth === 0 ? 'L0' : 'L' + depth,
        author: node.by || '[deleted]',
        score: '',
        text: indentLines(truncated, depth)
      });

      var childIds = Array.isArray(node.kids) ? node.kids : [];

      // At depth cutoff: don't recurse, but show "+N more replies" stub if any
      if (depth + 1 >= maxDepth) {
        if (childIds.length > 0) {
          rows.push({
            type: 'L' + (depth + 1),
            author: '',
            score: '',
            text: moreRepliesIndent(depth) + '[+' + childIds.length + ' more replies]'
          });
        }
        return;
      }

      // Process child replies (up to maxReplies limit)
      var toProcess = childIds.slice(0, maxReplies);
      var replies = await Promise.all(toProcess.map(function (cid) {
        return fetchItem(cid).catch(function () { return null; });
      }));

      for (var i = 0; i < replies.length; i += 1) {
        await walkComment(replies[i], depth + 1);
      }

      // "+N more replies" for whatever we skipped at this level
      var hidden = childIds.length - toProcess.length;
      if (hidden > 0) {
        rows.push({
          type: 'L' + (depth + 1),
          author: '',
          score: '',
          text: moreRepliesIndent(depth) + '[+' + hidden + ' more replies]'
        });
      }
    }

    // Walk top-level comments
    try {
      var topKids = Array.isArray(story.kids) ? story.kids : [];
      var topToFetch = topKids.slice(0, limit);
      var fetched = await Promise.all(topToFetch.map(function (kidId) {
        return fetchItem(kidId).catch(function () { return null; });
      }));

      for (var i = 0; i < fetched.length; i += 1) {
        await walkComment(fetched[i], 0);
      }

      // Show summary for hidden top-level comments
      var hiddenTopLevel = Math.max(0, topKids.length - topToFetch.length);
      if (hiddenTopLevel > 0) {
        rows.push({
          type: '',
          author: '',
          score: '',
          text: '[+' + hiddenTopLevel + ' more top-level comments]'
        });
      }
    } catch (e) {
      // If comment processing fails, still return the story
    }

    // Always return at least the story
    if (rows.length === 0) {
      rows.push({
        type: '',
        author: '',
        score: '',
        text: '[No comments found]'
      });
    }

    return successItems(rows);
  }

  window.__mediauseHackernews = {
    getTop: function (payload) {
      return listStories('top', payload || {});
    },
    getBest: function (payload) {
      return listStories('best', payload || {});
    },
    getAsk: function (payload) {
      return listStories('ask', payload || {});
    },
    getNew: function (payload) {
      return listStories('new', payload || {});
    },
    getShow: function (payload) {
      return listStories('show', payload || {});
    },
    getJobs: function (payload) {
      return listStories('jobs', payload || {});
    },
    searchStories: function (payload) {
      return searchStories(payload || {});
    },
    userProfile: function (payload) {
      return userProfile(payload || {});
    },
    readItem: function (payload) {
      return readItem(payload || {});
    }
  };
})();
