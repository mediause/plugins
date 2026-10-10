(function () {
  var helpers = window.__mediauseRedditHelpers || {};

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

  function mapListingPost(item, index) {
    return {
      rank: index + 1,
      title: item.title || '',
      subreddit: item.subreddit_name_prefixed || '',
      score: item.score || 0,
      comments: item.num_comments || 0,
      postId: item.id || '',
      author: item.author || '',
      url: helpers.toRedditUrl(item.permalink || '')
    };
  }

  function parseBoolean(value, defaultValue) {
    if (typeof value === 'boolean') {
      return value;
    }
    var raw = String(value || '').trim().toLowerCase();
    if (!raw) {
      return !!defaultValue;
    }
    if (raw === 'true' || raw === '1' || raw === 'yes' || raw === 'y') {
      return true;
    }
    if (raw === 'false' || raw === '0' || raw === 'no' || raw === 'n') {
      return false;
    }
    return !!defaultValue;
  }

  async function fetchListing(path, limit) {
    var data = await helpers.fetchJson(path);
    var children = data && data.data && Array.isArray(data.data.children) ? data.data.children : [];
    var rows = children.map(function (c, index) {
      return mapListingPost(c.data || {}, index);
    });
    return rows.slice(0, limit);
  }

  async function accountHealth() {
    try {
      var me = await helpers.getMe();
      var username = me && (me.name || (me.data && me.data.name)) || null;
      var uid = me && (me.id || (me.data && me.data.id)) || null;
      var loggedIn = !!username;
      return {
        success: true,
        data: {
          healthy: loggedIn,
          account: {
            id: uid || username,
            nick: username,
            login: loggedIn
          }
        }
      };
    } catch (_error) {
      return {
        success: true,
        data: {
          healthy: false,
          account: {
            id: null,
            nick: null,
            login: false,
          }
        }
      };
    }
  }

  async function getHot(payload) {
    try {
      var subreddit = helpers.normalizeSubredditName(payload && payload.subreddit);
      var limit = helpers.sanitizeLimit(payload && payload.limit, 20);
      var path = subreddit
        ? '/r/' + encodeURIComponent(subreddit) + '/hot.json?limit=' + limit + '&raw_json=1'
        : '/hot.json?limit=' + limit + '&raw_json=1';
      return successItems(await fetchListing(path, limit));
    } catch (error) {
      return errorResult('reddit.get.hot_failed', 'get hot failed', String(error));
    }
  }

  async function getHome(payload) {
    try {
      var limit = Math.min(100, helpers.sanitizeLimit(payload && payload.limit, 25));
      var me = await helpers.getMe();
      var username = me && (me.name || (me.data && me.data.name));
      if (!username) {
        return errorResult('reddit.get.home_auth_required', 'login required for personalized home feed');
      }

      return successItems(await fetchListing('/best.json?limit=' + limit + '&raw_json=1', limit));
    } catch (error) {
      return errorResult('reddit.get.home_failed', 'get home failed', String(error));
    }
  }

  async function getPopular(payload) {
    try {
      var limit = helpers.sanitizeLimit(payload && payload.limit, 20);
      return successItems(await fetchListing('/r/popular.json?limit=' + limit + '&raw_json=1', limit));
    } catch (error) {
      return errorResult('reddit.get.popular_failed', 'get popular failed', String(error));
    }
  }

  async function getFrontpage(payload) {
    try {
      var limit = helpers.sanitizeLimit(payload && payload.limit, 15);
      return successItems(await fetchListing('/r/all.json?limit=' + limit + '&raw_json=1', limit));
    } catch (error) {
      return errorResult('reddit.get.frontpage_failed', 'get frontpage failed', String(error));
    }
  }

  async function getSubreddit(payload) {
    try {
      var name = helpers.normalizeSubredditName(payload && payload.name);
      if (!name) {
        return errorResult('reddit.get.subreddit_name_required', 'subreddit name is required');
      }

      var sort = String((payload && payload.sort) || 'hot').toLowerCase();
      var time = String((payload && payload.time) || 'all').toLowerCase();
      var limit = helpers.sanitizeLimit(payload && payload.limit, 15);
      var path = '/r/' + encodeURIComponent(name) + '/' + sort + '.json?limit=' + limit + '&raw_json=1';
      if ((sort === 'top' || sort === 'controversial') && time) {
        path += '&t=' + encodeURIComponent(time);
      }

      return successItems(await fetchListing(path, limit));
    } catch (error) {
      return errorResult('reddit.get.subreddit_failed', 'get subreddit failed', String(error));
    }
  }

  async function getSubredditInfo(payload) {
    try {
      var name = helpers.normalizeSubredditName(payload && payload.name);
      if (!name) {
        return errorResult('reddit.get.subreddit_name_required', 'subreddit name is required');
      }

      var data = await helpers.fetchJson('/r/' + encodeURIComponent(name) + '/about.json?raw_json=1');
      var info = data && data.data ? data.data : (data || {});
      if (!info.display_name) {
        return errorResult('reddit.get.subreddit_info_not_found', 'subreddit not found or inaccessible');
      }

      var created = info.created_utc
        ? new Date(info.created_utc * 1000).toISOString().slice(0, 10)
        : '-';
      var activeNow = (typeof info.active_user_count === 'number')
        ? info.active_user_count
        : (typeof info.accounts_active === 'number' ? info.accounts_active : null);

      return successItems([
        { field: 'Name', value: info.display_name_prefixed || ('r/' + info.display_name) },
        { field: 'Title', value: info.title || '-' },
        { field: 'Subscribers', value: String(info.subscribers || 0) },
        { field: 'Active Now', value: activeNow == null ? '-' : String(activeNow) },
        { field: 'NSFW', value: info.over18 ? 'Yes' : 'No' },
        { field: 'Type', value: info.subreddit_type || '-' },
        { field: 'Description', value: (info.public_description || '').trim() || '-' },
        { field: 'Created', value: created },
        { field: 'URL', value: info.url ? helpers.toRedditUrl(info.url) : '-' }
      ]);
    } catch (error) {
      return errorResult('reddit.get.subreddit_info_failed', 'get subreddit info failed', String(error));
    }
  }

  async function searchPosts(payload) {
    try {
      var query = String((payload && payload.query) || '').trim();
      if (!query) {
        return errorResult('reddit.search.query_required', 'query is required');
      }

      var subreddit = helpers.normalizeSubredditName(payload && payload.subreddit);
      var sort = String((payload && payload.sort) || 'relevance').toLowerCase();
      var time = String((payload && payload.time) || 'all').toLowerCase();
      var limit = helpers.sanitizeLimit(payload && payload.limit, 15);
      var base = subreddit
        ? '/r/' + encodeURIComponent(subreddit) + '/search.json'
        : '/search.json';

      var path = base
        + '?q=' + encodeURIComponent(query)
        + '&sort=' + encodeURIComponent(sort)
        + '&t=' + encodeURIComponent(time)
        + '&limit=' + limit
        + '&restrict_sr=' + (subreddit ? 'on' : 'off')
        + '&raw_json=1';

      return successItems(await fetchListing(path, limit));
    } catch (error) {
      return errorResult('reddit.search.posts_failed', 'search posts failed', String(error));
    }
  }

  async function readItem(payload) {
    try {
      var postInput = payload && payload.post_id;
      var postId = helpers.normalizePostId(postInput);
      if (/^t3_[a-z0-9]+$/i.test(postId)) {
        postId = postId.slice(3);
      }
      if (!postId) {
        return errorResult('reddit.read.post_id_required', 'post_id is required');
      }

      var expandMore = payload && payload.expand_more !== undefined
        ? parseBoolean(payload.expand_more, true)
        : true;
      var expandRoundsRaw = helpers.sanitizeLimit(payload && payload.expand_rounds, 2);
      var expandRounds = Math.min(5, Math.max(1, expandRoundsRaw));

      var sort = String((payload && payload.sort) || 'best').toLowerCase();
      var limit = helpers.sanitizeLimit(payload && payload.limit, 25);
      var maxDepth = helpers.sanitizeLimit(payload && payload.depth, 2);
      var maxReplies = helpers.sanitizeLimit(payload && payload.replies, 5);
      var maxLength = Math.max(100, helpers.sanitizeLimit(payload && payload.max_length, 2000));
      var apiLimit = Math.max(limit * 3, 100);
      var data = await helpers.fetchJson('/comments/' + encodeURIComponent(postId) + '.json?sort=' + sort + '&limit=' + apiLimit + '&depth=' + (maxDepth + 1) + '&raw_json=1');

      if (!Array.isArray(data) || data.length < 2) {
        return errorResult('reddit.read.bad_response', 'unexpected reddit response format');
      }

      var topLevel = data[1] && data[1].data && Array.isArray(data[1].data.children) ? data[1].data.children : [];
      var linkFullname = 't3_' + postId;

      function collectMoreStubs(parentArr, parentT1) {
        var out = [];
        if (!Array.isArray(parentArr)) {
          return out;
        }
        for (var idx = 0; idx < parentArr.length; idx += 1) {
          var node = parentArr[idx];
          if (!node || !node.data) {
            continue;
          }
          if (node.kind === 'more' && Array.isArray(node.data.children) && node.data.children.length > 0) {
            out.push({
              stub: node,
              hostArr: parentArr,
              hostT1: parentT1
            });
            continue;
          }
          if (node.kind === 't1' && node.data.replies && node.data.replies.data && Array.isArray(node.data.replies.data.children)) {
            var nested = collectMoreStubs(node.data.replies.data.children, node);
            for (var n = 0; n < nested.length; n += 1) {
              out.push(nested[n]);
            }
          }
        }
        return out;
      }

      async function expandMoreCommentsIfNeeded() {
        if (!expandMore) {
          return;
        }

        for (var round = 0; round < expandRounds; round += 1) {
          var stubs = collectMoreStubs(topLevel, null);
          if (!stubs.length) {
            return;
          }

          var allIds = [];
          for (var s = 0; s < stubs.length; s += 1) {
            var stubChildren = stubs[s].stub && stubs[s].stub.data && Array.isArray(stubs[s].stub.data.children)
              ? stubs[s].stub.data.children
              : [];
            for (var c = 0; c < stubChildren.length; c += 1) {
              allIds.push(String(stubChildren[c] || '').trim());
            }
          }

          var uniqIds = [];
          var seen = {};
          for (var i = 0; i < allIds.length; i += 1) {
            var id = allIds[i];
            if (!id || seen[id]) {
              continue;
            }
            seen[id] = true;
            uniqIds.push(id);
          }
          if (!uniqIds.length) {
            return;
          }

          var fetchedThings = [];
          for (var start = 0; start < uniqIds.length; start += 100) {
            var batch = uniqIds.slice(start, start + 100);
            var body = 'api_type=json'
              + '&link_id=' + encodeURIComponent(linkFullname)
              + '&children=' + encodeURIComponent(batch.join(','))
              + '&sort=' + encodeURIComponent(sort)
              + '&raw_json=1';

            var response = await fetch('/api/morechildren', {
              method: 'POST',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: body
            });

            if (!response.ok) {
              return;
            }

            var expanded = await response.json();
            var errors = expanded && expanded.json && Array.isArray(expanded.json.errors)
              ? expanded.json.errors
              : [];
            if (errors.length) {
              return;
            }

            var things = expanded && expanded.json && expanded.json.data && Array.isArray(expanded.json.data.things)
              ? expanded.json.data.things
              : [];
            if (!things.length) {
              continue;
            }

            for (var t = 0; t < things.length; t += 1) {
              fetchedThings.push(things[t]);
            }
          }

          if (!fetchedThings.length) {
            return;
          }

          var fetchedById = {};
          for (var f = 0; f < fetchedThings.length; f += 1) {
            var thing = fetchedThings[f];
            if (!thing || !thing.data) {
              continue;
            }
            if (thing.data.id) {
              fetchedById[String(thing.data.id)] = thing;
            }
            if (thing.data.name) {
              fetchedById[String(thing.data.name)] = thing;
            }
          }

          var inserted = {};
          function thingKey(thing) {
            if (!thing || !thing.data) {
              return '';
            }
            return thing.data.name || (thing.kind + '_' + thing.data.id);
          }

          for (var st = 0; st < stubs.length; st += 1) {
            var rec = stubs[st];
            var idx = rec.hostArr.indexOf(rec.stub);
            if (idx < 0) {
              continue;
            }

            var expectedParent = rec.hostT1 && rec.hostT1.data
              ? (rec.hostT1.data.name || ('t1_' + rec.hostT1.data.id))
              : linkFullname;

            var replacements = [];
            var unresolvedChildren = [];
            var childrenIds = rec.stub && rec.stub.data && Array.isArray(rec.stub.data.children)
              ? rec.stub.data.children
              : [];
            for (var ci = 0; ci < childrenIds.length; ci += 1) {
              var childId = String(childrenIds[ci] || '').trim();
              if (!childId) {
                continue;
              }
              var replacement = fetchedById[childId] || fetchedById['t1_' + childId];
              if (!replacement || !replacement.data) {
                unresolvedChildren.push(childId);
                continue;
              }
              if (replacement.data.parent_id !== expectedParent) {
                unresolvedChildren.push(childId);
                continue;
              }
              var key = thingKey(replacement);
              if (key && inserted[key]) {
                unresolvedChildren.push(childId);
                continue;
              }
              replacements.push(replacement);
              if (key) {
                inserted[key] = true;
              }
            }

            if (!replacements.length) {
              continue;
            }

            rec.hostArr.splice(idx, 1);
            for (var ri = replacements.length - 1; ri >= 0; ri -= 1) {
              rec.hostArr.splice(idx, 0, replacements[ri]);
            }

            if (unresolvedChildren.length) {
              var preservedMore = {
                kind: 'more',
                data: {
                  count: unresolvedChildren.length,
                  children: unresolvedChildren
                }
              };
              rec.hostArr.splice(idx + replacements.length, 0, preservedMore);
            }
          }
        }
      }

      await expandMoreCommentsIfNeeded();

      var results = [];
      var post = data[0] && data[0].data && data[0].data.children && data[0].data.children[0] && data[0].data.children[0].data;
      if (post) {
        var body = helpers.shorten(post.selftext || '', maxLength);
        results.push({
          type: 'POST',
          author: post.author || '[deleted]',
          score: post.score || 0,
          text: (post.title || '') + (body ? '\n\n' + body : '') + (post.url && !post.is_self ? '\n' + post.url : '')
        });
      }

      function walkComment(node, depth) {
        if (!node || node.kind !== 't1') {
          return;
        }
        var d = node.data || {};
        var body = helpers.shorten(d.body || '', maxLength);
        var indent = depth > 0 ? '  '.repeat(depth) + '> ' : '';
        var formatted = depth > 0
          ? body.split('\n').map(function (line) { return indent + line; }).join('\n')
          : body;

        results.push({
          type: depth === 0 ? 'L0' : 'L' + depth,
          author: d.author || '[deleted]',
          score: d.score || 0,
          text: formatted
        });

        var repliesNode = d.replies && d.replies.data && Array.isArray(d.replies.data.children)
          ? d.replies.data.children
          : [];
        var replyComments = [];
        var moreCount = 0;
        for (var i = 0; i < repliesNode.length; i += 1) {
          if (repliesNode[i].kind === 't1') {
            replyComments.push(repliesNode[i]);
          } else if (repliesNode[i].kind === 'more') {
            moreCount += repliesNode[i].data && repliesNode[i].data.count ? repliesNode[i].data.count : 0;
          }
        }

        if (depth + 1 >= maxDepth) {
          var hiddenCutoff = replyComments.length + moreCount;
          if (hiddenCutoff > 0) {
            results.push({
              type: 'L' + (depth + 1),
              author: '',
              score: '',
              text: '  '.repeat(depth + 1) + '[+' + hiddenCutoff + ' more replies]'
            });
          }
          return;
        }

        replyComments.sort(function (a, b) {
          return ((b.data && b.data.score) || 0) - ((a.data && a.data.score) || 0);
        });

        var take = Math.min(maxReplies, replyComments.length);
        for (var j = 0; j < take; j += 1) {
          walkComment(replyComments[j], depth + 1);
        }

        var hidden = replyComments.length - take + moreCount;
        if (hidden > 0) {
          results.push({
            type: 'L' + (depth + 1),
            author: '',
            score: '',
            text: '  '.repeat(depth + 1) + '[+' + hidden + ' more replies]'
          });
        }
      }

      var topComments = topLevel.filter(function (item) {
        return item.kind === 't1';
      });

      for (var k = 0; k < Math.min(limit, topComments.length); k += 1) {
        walkComment(topComments[k], 0);
      }

      var topMore = topLevel
        .filter(function (item) { return item.kind === 'more'; })
        .reduce(function (sum, item) {
          return sum + ((item.data && item.data.count) || 0);
        }, 0);
      var hiddenTop = Math.max(0, topComments.length - limit) + topMore;
      if (hiddenTop > 0) {
        results.push({
          type: '',
          author: '',
          score: '',
          text: '[+' + hiddenTop + ' more top-level comments]'
        });
      }

      return successItems(results);
    } catch (error) {
      return errorResult('reddit.read.item_failed', 'read item failed', String(error));
    }
  }

  function buildWhoamiItems(user) {
    var created = user.created_utc
      ? new Date(user.created_utc * 1000).toISOString().slice(0, 10)
      : '-';
    var linkKarma = typeof user.link_karma === 'number' ? user.link_karma : 0;
    var commentKarma = typeof user.comment_karma === 'number' ? user.comment_karma : 0;
    var totalKarma = typeof user.total_karma === 'number' ? user.total_karma : (linkKarma + commentKarma);

    return [
      { field: 'Username', value: 'u/' + user.name },
      { field: 'ID', value: user.id ? 't2_' + user.id : '-' },
      { field: 'Post Karma', value: String(linkKarma) },
      { field: 'Comment Karma', value: String(commentKarma) },
      { field: 'Total Karma', value: String(totalKarma) },
      { field: 'Account Created', value: created },
      { field: 'Gold', value: user.is_gold ? 'Yes' : 'No' },
      { field: 'Mod', value: user.is_mod ? 'Yes' : 'No' },
      { field: 'Verified Email', value: user.has_verified_email ? 'Yes' : 'No' },
      { field: 'Has Mail', value: user.has_mail ? 'Yes' : 'No' },
      { field: 'Inbox Count', value: String(user.inbox_count || 0) }
    ];
  }

  async function userProfile(payload) {
    try {
      var username = String((payload && payload.username) || '').trim();
      var meOnly = parseBoolean(payload && payload.me, false);

      if (!username || meOnly) {
        var me = await helpers.getMe();
        var selfUser = me && me.data ? me.data : (me || {});
        if (!selfUser.name) {
          return errorResult('reddit.user.whoami_auth_required', 'not logged in to reddit.com');
        }
        return successItems(buildWhoamiItems(selfUser));
      }

      var clean = username.toLowerCase().startsWith('u/') ? username.slice(2) : username;
      var data = await helpers.fetchJson('/user/' + encodeURIComponent(clean) + '/about.json?raw_json=1');
      var user = data && data.data ? data.data : (data || {});
      var created = user.created_utc
        ? new Date(user.created_utc * 1000).toISOString().slice(0, 10)
        : '-';

      return successItems([
        { field: 'Username', value: 'u/' + (user.name || clean) },
        { field: 'Post Karma', value: String(user.link_karma || 0) },
        { field: 'Comment Karma', value: String(user.comment_karma || 0) },
        { field: 'Total Karma', value: String(user.total_karma || ((user.link_karma || 0) + (user.comment_karma || 0))) },
        { field: 'Account Created', value: created },
        { field: 'Gold', value: user.is_gold ? 'Yes' : 'No' },
        { field: 'Verified', value: user.verified ? 'Yes' : 'No' }
      ]);
    } catch (error) {
      return errorResult('reddit.user.profile_failed', 'user profile failed', String(error));
    }
  }

  async function userPosts(payload) {
    try {
      var username = String((payload && payload.username) || '').trim();
      if (!username) {
        return errorResult('reddit.user.username_required', 'username is required');
      }

      var clean = username.toLowerCase().startsWith('u/') ? username.slice(2) : username;
      var limit = helpers.sanitizeLimit(payload && payload.limit, 15);
      var data = await helpers.fetchJson('/user/' + encodeURIComponent(clean) + '/submitted.json?limit=' + limit + '&raw_json=1');
      var children = data && data.data && Array.isArray(data.data.children) ? data.data.children : [];
      var items = children.map(function (item) {
        var d = item.data || {};
        return {
          title: d.title || '',
          subreddit: d.subreddit_name_prefixed || '',
          score: d.score || 0,
          comments: d.num_comments || 0,
          url: helpers.toRedditUrl(d.permalink || '')
        };
      });
      return successItems(items.slice(0, limit));
    } catch (error) {
      return errorResult('reddit.user.posts_failed', 'user posts failed', String(error));
    }
  }

  async function userComments(payload) {
    try {
      var username = String((payload && payload.username) || '').trim();
      if (!username) {
        return errorResult('reddit.user.username_required', 'username is required');
      }

      var clean = username.toLowerCase().startsWith('u/') ? username.slice(2) : username;
      var limit = helpers.sanitizeLimit(payload && payload.limit, 15);
      var data = await helpers.fetchJson('/user/' + encodeURIComponent(clean) + '/comments.json?limit=' + limit + '&raw_json=1');
      var children = data && data.data && Array.isArray(data.data.children) ? data.data.children : [];
      var items = children.map(function (item) {
        var d = item.data || {};
        return {
          subreddit: d.subreddit_name_prefixed || '',
          score: d.score || 0,
          body: helpers.shorten(d.body || '', 300),
          url: helpers.toRedditUrl(d.permalink || '')
        };
      });
      return successItems(items.slice(0, limit));
    } catch (error) {
      return errorResult('reddit.user.comments_failed', 'user comments failed', String(error));
    }
  }

  async function collectionSaved(payload) {
    try {
      var limit = helpers.sanitizeLimit(payload && payload.limit, 15);
      var me = await helpers.getMe();
      var username = me && (me.name || (me.data && me.data.name));
      if (!username) {
        return errorResult('reddit.collection.auth_required', 'not logged in: cannot determine username');
      }

      var data = await helpers.fetchJson('/user/' + encodeURIComponent(username) + '/saved.json?limit=' + limit + '&raw_json=1');
      var children = data && data.data && Array.isArray(data.data.children) ? data.data.children : [];
      var items = children.map(function (item) {
        var d = item.data || {};
        return {
          title: d.title || helpers.shorten(d.body || '-', 100) || '-',
          subreddit: d.subreddit_name_prefixed || ('r/' + (d.subreddit || '?')),
          score: d.score || 0,
          comments: d.num_comments || 0,
          url: helpers.toRedditUrl(d.permalink || '')
        };
      });
      return successItems(items.slice(0, limit));
    } catch (error) {
      return errorResult('reddit.collection.saved_failed', 'collection saved failed', String(error));
    }
  }

  async function collectionSubscribed(payload) {
    try {
      var limit = Math.min(1000, helpers.sanitizeLimit(payload && payload.limit, 100));
      var me = await helpers.getMe();
      var username = me && (me.name || (me.data && me.data.name));
      if (!username) {
        return errorResult('reddit.collection.auth_required', 'not logged in: cannot determine username');
      }

      var items = [];
      var after = '';
      for (var pageIndex = 0; pageIndex < 20 && items.length < limit; pageIndex += 1) {
        var pageLimit = Math.min(100, limit - items.length);
        var path = '/subreddits/mine/subscriptions.json?limit=' + pageLimit + '&raw_json=1';
        if (after) {
          path += '&after=' + encodeURIComponent(after);
        }

        var data = await helpers.fetchJson(path);
        var listing = data && data.data ? data.data : {};
        var children = Array.isArray(listing.children) ? listing.children : [];
        for (var i = 0; i < children.length && items.length < limit; i += 1) {
          var d = children[i] && children[i].data ? children[i].data : {};
          var displayName = d.display_name || '';
          if (!displayName) {
            continue;
          }

          var fullname = (d.name && String(d.name).startsWith('t5_'))
            ? d.name
            : (d.id ? ('t5_' + d.id) : '');
          items.push({
            id: fullname,
            subreddit: d.display_name_prefixed || ('r/' + displayName),
            title: d.title || '-',
            subscribers: (typeof d.subscribers === 'number') ? d.subscribers : null,
            description: helpers.shorten((d.public_description || '').trim(), 200),
            url: d.url ? helpers.toRedditUrl(d.url) : '-'
          });
        }

        after = listing.after || '';
        if (!after) {
          break;
        }
      }

      if (!items.length) {
        return errorResult('reddit.collection.subscribed_empty', 'no subscribed subreddits found');
      }

      return successItems(items);
    } catch (error) {
      return errorResult('reddit.collection.subscribed_failed', 'collection subscribed failed', String(error));
    }
  }

  function normalizeCommentFullname(input) {
    var raw = String(input || '').trim();
    if (!raw) {
      return '';
    }
    if (/^t1_[a-z0-9]+$/i.test(raw)) {
      return raw.toLowerCase();
    }
    if (/^https?:\/\//i.test(raw)) {
      try {
        var url = new URL(raw);
        var parts = url.pathname.split('/').filter(Boolean);
        var commentsIndex = parts.indexOf('comments');
        var commentIndex = commentsIndex + 3;
        if (commentsIndex >= 0 && parts.length > commentIndex) {
          return 't1_' + String(parts[commentIndex] || '').toLowerCase();
        }
      } catch (_error) {
        return '';
      }
      return '';
    }
    if (/^[a-z0-9]+$/i.test(raw)) {
      return 't1_' + raw.toLowerCase();
    }
    return '';
  }

  async function collectionUpvoted(payload) {
    try {
      var limit = helpers.sanitizeLimit(payload && payload.limit, 15);
      var me = await helpers.getMe();
      var username = me && (me.name || (me.data && me.data.name));
      if (!username) {
        return errorResult('reddit.collection.auth_required', 'not logged in: cannot determine username');
      }

      var data = await helpers.fetchJson('/user/' + encodeURIComponent(username) + '/upvoted.json?limit=' + limit + '&raw_json=1');
      var children = data && data.data && Array.isArray(data.data.children) ? data.data.children : [];
      var items = children.map(function (item) {
        var d = item.data || {};
        return {
          title: d.title || '-',
          subreddit: d.subreddit_name_prefixed || ('r/' + (d.subreddit || '?')),
          score: d.score || 0,
          comments: d.num_comments || 0,
          url: helpers.toRedditUrl(d.permalink || '')
        };
      });
      return successItems(items.slice(0, limit));
    } catch (error) {
      return errorResult('reddit.collection.upvoted_failed', 'collection upvoted failed', String(error));
    }
  }

  async function engageComment(payload) {
    try {
      var fullname = helpers.fullnameForPostOrComment(payload && payload.post_id);
      var text = String((payload && payload.text) || '').trim();
      if (!fullname) {
        return errorResult('reddit.engage.post_id_required', 'post_id is required');
      }
      if (!text) {
        return errorResult('reddit.engage.text_required', 'text is required');
      }

      var modhash = await helpers.getModhash();
      var body = 'parent=' + encodeURIComponent(fullname)
        + '&text=' + encodeURIComponent(text)
        + '&api_type=json'
        + (modhash ? '&uh=' + encodeURIComponent(modhash) : '');

      var response = await fetch('/api/comment', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      });

      if (!response.ok) {
        return errorResult('reddit.engage.comment_http_failed', 'comment request failed', 'HTTP ' + response.status);
      }

      var data = await response.json();
      var errors = data && data.json && Array.isArray(data.json.errors) ? data.json.errors : [];
      if (errors.length > 0) {
        return errorResult('reddit.engage.comment_api_failed', 'comment rejected', JSON.stringify(errors));
      }

      return successItems([{ status: 'success', message: 'comment posted on ' + fullname }]);
    } catch (error) {
      return errorResult('reddit.engage.comment_failed', 'engage comment failed', String(error));
    }
  }

  async function engageReply(payload) {
    try {
      var fullname = normalizeCommentFullname(payload && payload.comment_id);
      var text = String((payload && payload.text) || '').trim();
      if (!fullname) {
        return errorResult('reddit.engage.comment_id_required', 'comment_id is required');
      }
      if (!text) {
        return errorResult('reddit.engage.text_required', 'text is required');
      }

      var modhash = await helpers.getModhash();
      var body = 'parent=' + encodeURIComponent(fullname)
        + '&text=' + encodeURIComponent(text)
        + '&api_type=json'
        + (modhash ? '&uh=' + encodeURIComponent(modhash) : '');

      var response = await fetch('/api/comment', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      });

      if (!response.ok) {
        return errorResult('reddit.engage.reply_http_failed', 'reply request failed', 'HTTP ' + response.status);
      }

      var data = await response.json();
      var errors = data && data.json && Array.isArray(data.json.errors) ? data.json.errors : [];
      if (errors.length > 0) {
        return errorResult('reddit.engage.reply_api_failed', 'reply rejected', JSON.stringify(errors));
      }

      return successItems([{ status: 'success', message: 'reply posted on ' + fullname }]);
    } catch (error) {
      return errorResult('reddit.engage.reply_failed', 'engage reply failed', String(error));
    }
  }

  async function engageSave(payload) {
    try {
      var fullname = helpers.fullnameForPostOrComment(payload && payload.post_id);
      var undo = !!(payload && payload.undo);
      if (!fullname) {
        return errorResult('reddit.engage.post_id_required', 'post_id is required');
      }

      var modhash = await helpers.getModhash();
      var endpoint = undo ? '/api/unsave' : '/api/save';
      var body = 'id=' + encodeURIComponent(fullname) + (modhash ? '&uh=' + encodeURIComponent(modhash) : '');
      var response = await fetch(endpoint, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      });

      if (!response.ok) {
        return errorResult('reddit.engage.save_http_failed', 'save request failed', 'HTTP ' + response.status);
      }

      return successItems([{ status: 'success', message: (undo ? 'unsaved ' : 'saved ') + fullname }]);
    } catch (error) {
      return errorResult('reddit.engage.save_failed', 'engage save failed', String(error));
    }
  }

  async function engageUpvote(payload) {
    try {
      var fullname = helpers.fullnameForPostOrComment(payload && payload.post_id);
      var directionRaw = String((payload && payload.direction) || 'up').toLowerCase();
      if (!fullname) {
        return errorResult('reddit.engage.post_id_required', 'post_id is required');
      }

      var direction = directionRaw === 'down' ? -1 : (directionRaw === 'none' ? 0 : 1);
      var modhash = await helpers.getModhash();
      var body = 'id=' + encodeURIComponent(fullname)
        + '&dir=' + direction
        + (modhash ? '&uh=' + encodeURIComponent(modhash) : '');

      var response = await fetch('/api/vote', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      });

      if (!response.ok) {
        return errorResult('reddit.engage.upvote_http_failed', 'vote request failed', 'HTTP ' + response.status);
      }

      return successItems([{ status: 'success', message: 'vote(' + direction + ') on ' + fullname }]);
    } catch (error) {
      return errorResult('reddit.engage.upvote_failed', 'engage upvote failed', String(error));
    }
  }

  async function engageSubscribe(payload) {
    try {
      var subreddit = helpers.normalizeSubredditName(payload && payload.subreddit);
      var undo = !!(payload && payload.undo);
      if (!subreddit) {
        return errorResult('reddit.engage.subreddit_required', 'subreddit is required');
      }

      var modhash = await helpers.getModhash();
      var body = 'sr_name=' + encodeURIComponent(subreddit)
        + '&action=' + (undo ? 'unsub' : 'sub')
        + (modhash ? '&uh=' + encodeURIComponent(modhash) : '');
      var response = await fetch('/api/subscribe', {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: body
      });

      if (!response.ok) {
        return errorResult('reddit.engage.subscribe_http_failed', 'subscribe request failed', 'HTTP ' + response.status);
      }

      return successItems([{ status: 'success', message: (undo ? 'unsubscribed from r/' : 'subscribed to r/') + subreddit }]);
    } catch (error) {
      return errorResult('reddit.engage.subscribe_failed', 'engage subscribe failed', String(error));
    }
  }

  window.__mediauseReddit = {
    accountHealth: accountHealth,
    getHome: getHome,
    getHot: getHot,
    getPopular: getPopular,
    getFrontpage: getFrontpage,
    getSubreddit: getSubreddit,
    getSubredditInfo: getSubredditInfo,
    searchPosts: searchPosts,
    readItem: readItem,
    userProfile: userProfile,
    userPosts: userPosts,
    userComments: userComments,
    collectionSubscribed: collectionSubscribed,
    collectionSaved: collectionSaved,
    collectionUpvoted: collectionUpvoted,
    engageComment: engageComment,
    engageReply: engageReply,
    engageSave: engageSave,
    engageUpvote: engageUpvote,
    engageSubscribe: engageSubscribe
  };
})();
