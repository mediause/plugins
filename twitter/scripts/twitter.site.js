(function () {
  var helpers = window.__mediauseTwitterHelpers;

  var USER_BY_SCREEN_NAME_QUERY_ID = 'qRednkZG-rn1P6b48NINmQ';
  var USER_TWEETS_QUERY_ID = '6fWQaBPK51aGyC_VC7t9GQ';
  var FOLLOWING_QUERY_ID = 'zx6e-TLzRkeDO_a7p4b3JQ';
  var LIKES_QUERY_ID = 'RozQdCp4CilQzrcuU0NY5w';
  var HOME_TIMELINE_QUERY_ID = 'c-CzHF1LboFilMpsx4ZCrQ';
  var HOME_LATEST_TIMELINE_QUERY_ID = 'BKB7oi212Fi7kQtCBGE4zA';
  var BOOKMARKS_QUERY_ID = 'Fy0QMy4q_aZCpkO0PnyLYw';
  var LISTS_QUERY_ID = '78UbkyXwXBD98IgUWXOy9g';
  var LIST_TWEETS_QUERY_ID = 'RlZzktZY_9wJynoepm8ZsA';

  var USER_BY_SCREEN_NAME_FEATURES = {
    hidden_profile_subscriptions_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    responsive_web_graphql_exclude_directive_enabled: true,
    verified_phone_label_enabled: false,
    subscriptions_verification_info_is_identity_verified_enabled: true,
    subscriptions_verification_info_verified_since_enabled: true,
    highlights_tweets_tab_ui_enabled: true,
    responsive_web_twitter_article_notes_tab_enabled: true,
    subscriptions_feature_can_gift_premium: true,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    responsive_web_graphql_timeline_navigation_enabled: true
  };

  var USER_TWEETS_FEATURES = {
    rweb_video_screen_enabled: false,
    payments_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: true,
    responsive_web_grok_share_attachment_enabled: true,
    responsive_web_grok_annotations_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    content_disclosure_indicator_enabled: true,
    content_disclosure_ai_generated_indicator_enabled: true,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    post_ctas_fetch_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_grok_imagine_annotation_enabled: true,
    responsive_web_grok_community_note_auto_translation_is_enabled: false,
    responsive_web_enhance_cards_enabled: false
  };

  var TIMELINE_FEATURES = {
    rweb_video_screen_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    rweb_tipjar_consumption_enabled: true,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: false,
    responsive_web_grok_share_attachment_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: false,
    creator_subscriptions_quote_tweet_preview_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: true,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_enhance_cards_enabled: false
  };

  var FOLLOWING_FEATURES = {
    rweb_video_screen_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    responsive_web_profile_redirect_enabled: false,
    rweb_tipjar_consumption_enabled: false,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    responsive_web_grok_analyze_button_fetch_trends_enabled: false,
    responsive_web_grok_analyze_post_followups_enabled: true,
    responsive_web_jetfuel_frame: true,
    responsive_web_grok_share_attachment_enabled: true,
    responsive_web_grok_annotations_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    content_disclosure_indicator_enabled: true,
    content_disclosure_ai_generated_indicator_enabled: true,
    responsive_web_grok_show_grok_translated_post: false,
    responsive_web_grok_analysis_button_from_backend: true,
    post_ctas_fetch_enabled: false,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: false,
    responsive_web_grok_image_annotation_enabled: true,
    responsive_web_grok_imagine_annotation_enabled: true,
    responsive_web_grok_community_note_auto_translation_is_enabled: false,
    responsive_web_enhance_cards_enabled: false
  };

  var BOOKMARKS_FEATURES = {
    rweb_video_screen_enabled: false,
    profile_label_improvements_pcf_label_in_post_enabled: true,
    responsive_web_profile_redirect_enabled: false,
    rweb_tipjar_consumption_enabled: false,
    verified_phone_label_enabled: false,
    creator_subscriptions_tweet_preview_api_enabled: true,
    responsive_web_graphql_timeline_navigation_enabled: true,
    responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
    premium_content_api_read_enabled: false,
    communities_web_enable_tweet_community_results_fetch: true,
    c9s_tweet_anatomy_moderator_badge_enabled: true,
    articles_preview_enabled: true,
    responsive_web_edit_tweet_api_enabled: true,
    graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
    view_counts_everywhere_api_enabled: true,
    longform_notetweets_consumption_enabled: true,
    responsive_web_twitter_article_tweet_consumption_enabled: true,
    tweet_awards_web_tipping_enabled: false,
    content_disclosure_indicator_enabled: true,
    content_disclosure_ai_generated_indicator_enabled: true,
    freedom_of_speech_not_reach_fetch_enabled: true,
    standardized_nudges_misinfo: true,
    tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
    longform_notetweets_rich_text_read_enabled: true,
    longform_notetweets_inline_media_enabled: false,
    responsive_web_enhance_cards_enabled: false
  };

  var LISTS_FEATURES = TIMELINE_FEATURES;
  var LIST_TWEETS_FEATURES = TIMELINE_FEATURES;

  function invalidArgument(message) {
    return helpers.fail('twitter.invalid_argument', message);
  }

  async function resolveUser(username) {
    var normalized = helpers.normalizeScreenName(username);
    if (!normalized) {
      throw new Error('username is required');
    }

    var response = await helpers.fetchGraphql({
      operationName: 'UserByScreenName',
      endpoint: 'UserByScreenName',
      fallbackQueryId: USER_BY_SCREEN_NAME_QUERY_ID,
      variables: {
        screen_name: normalized,
        withSafetyModeUserFields: true
      },
      features: USER_BY_SCREEN_NAME_FEATURES
    });

    var result = response && response.data && response.data.user && response.data.user.result;
    if (!result || !result.rest_id) {
      throw new Error('Could not resolve @' + normalized);
    }

    return {
      userId: result.rest_id,
      result: result
    };
  }

  function extractTweet(result, seenMap) {
    if (!result) {
      return null;
    }

    var tweet = result.tweet || result;
    var legacy = tweet.legacy || {};
    if (!tweet.rest_id || seenMap[tweet.rest_id]) {
      return null;
    }

    seenMap[tweet.rest_id] = true;
    var user = tweet.core && tweet.core.user_results && tweet.core.user_results.result;
    var screenName = (user && user.legacy && user.legacy.screen_name)
      || (user && user.core && user.core.screen_name)
      || 'unknown';
    var displayName = (user && user.legacy && user.legacy.name)
      || (user && user.core && user.core.name)
      || '';
    var noteText = tweet.note_tweet && tweet.note_tweet.note_tweet_results && tweet.note_tweet.note_tweet_results.result
      ? tweet.note_tweet.note_tweet_results.result.text
      : '';

    return {
      id: tweet.rest_id,
      author: screenName,
      name: displayName,
      text: noteText || legacy.full_text || '',
      likes: legacy.favorite_count || 0,
      retweets: legacy.retweet_count || 0,
      replies: legacy.reply_count || 0,
      views: Number(tweet.views && tweet.views.count) || 0,
      created_at: legacy.created_at || '',
      url: 'https://x.com/' + screenName + '/status/' + tweet.rest_id,
      is_retweet: Boolean(legacy.retweeted_status_result || (legacy.full_text || '').indexOf('RT @') === 0),
      media: helpers.extractMedia(legacy)
    };
  }

  function formatTweet(tweet) {
    return {
      id: tweet.id,
      author: tweet.author,
      name: tweet.name,
      text: tweet.text,
      likes: tweet.likes,
      retweets: tweet.retweets,
      replies: tweet.replies,
      views: tweet.views,
      created_at: tweet.created_at,
      url: tweet.url,
      is_retweet: tweet.is_retweet,
      has_media: tweet.media.has_media,
      media_urls: tweet.media.media_urls
    };
  }

  function parseTimelineEntries(instructions, seenMap) {
    var tweets = [];
    var nextCursor = null;

    for (var instIndex = 0; instIndex < instructions.length; instIndex += 1) {
      var instruction = instructions[instIndex];
      var entries = instruction.entries || [];

      for (var entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
        var entry = entries[entryIndex];
        var content = entry.content;

        if (content && (content.entryType === 'TimelineTimelineCursor' || content.__typename === 'TimelineTimelineCursor')) {
          if (content.cursorType === 'Bottom' || content.cursorType === 'ShowMore') {
            nextCursor = content.value;
          }
          continue;
        }

        if (entry.entryId && (entry.entryId.indexOf('cursor-bottom-') === 0 || entry.entryId.indexOf('cursor-showMore-') === 0)) {
          nextCursor = (content && content.value) || (content && content.itemContent && content.itemContent.value) || nextCursor;
          continue;
        }

        var direct = extractTweet(content && content.itemContent && content.itemContent.tweet_results && content.itemContent.tweet_results.result, seenMap);
        if (direct) {
          tweets.push(formatTweet(direct));
          continue;
        }

        var items = (content && content.items) || [];
        for (var itemIndex = 0; itemIndex < items.length; itemIndex += 1) {
          var nested = extractTweet(items[itemIndex] && items[itemIndex].item && items[itemIndex].item.itemContent && items[itemIndex].item.itemContent.tweet_results && items[itemIndex].item.itemContent.tweet_results.result, seenMap);
          if (nested) {
            tweets.push(formatTweet(nested));
          }
        }
      }
    }

    return {
      tweets: tweets,
      nextCursor: nextCursor
    };
  }

  function parseUserTweets(data, seenMap) {
    var instructions = (data && data.data && data.data.user && data.data.user.result && data.data.user.result.timeline_v2 && data.data.user.result.timeline_v2.timeline && data.data.user.result.timeline_v2.timeline.instructions)
      || (data && data.data && data.data.user && data.data.user.result && data.data.user.result.timeline && data.data.user.result.timeline.timeline && data.data.user.result.timeline.timeline.instructions)
      || [];

    return parseTimelineEntries(instructions.filter(function (instruction) {
      return instruction.type !== 'TimelinePinEntry';
    }), seenMap);
  }

  function parseFollowing(data) {
    var users = [];
    var nextCursor = null;
    var instructions = (data && data.data && data.data.user && data.data.user.result && data.data.user.result.timeline_v2 && data.data.user.result.timeline_v2.timeline && data.data.user.result.timeline_v2.timeline.instructions)
      || (data && data.data && data.data.user && data.data.user.result && data.data.user.result.timeline && data.data.user.result.timeline.timeline && data.data.user.result.timeline.timeline.instructions)
      || [];

    for (var instIndex = 0; instIndex < instructions.length; instIndex += 1) {
      var instruction = instructions[instIndex];
      var entries = instruction.entries || [];

      for (var entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
        var entry = entries[entryIndex];
        var content = entry.content;

        if (content && (content.entryType === 'TimelineTimelineCursor' || content.__typename === 'TimelineTimelineCursor')) {
          if (content.cursorType === 'Bottom' || content.cursorType === 'ShowMore') {
            nextCursor = content.value;
          }
          continue;
        }

        if (entry.entryId && (entry.entryId.indexOf('cursor-bottom-') === 0 || entry.entryId.indexOf('cursor-showMore-') === 0)) {
          nextCursor = (content && content.value) || (content && content.itemContent && content.itemContent.value) || nextCursor;
          continue;
        }

        if (entry.entryId && entry.entryId.indexOf('user-') === 0) {
          var result = content && content.itemContent && content.itemContent.user_results && content.itemContent.user_results.result;
          if (result && result.__typename === 'User') {
            var core = result.core || {};
            var legacy = result.legacy || {};
            users.push({
              screen_name: core.screen_name || legacy.screen_name || 'unknown',
              name: core.name || legacy.name || 'unknown',
              bio: legacy.description || '',
              followers: legacy.followers_count || legacy.normal_followers_count || 0
            });
          }
        }
      }
    }

    return {
      users: users,
      nextCursor: nextCursor
    };
  }

  function parseBookmarks(data, seenMap) {
    var instructions = (data && data.data && data.data.bookmark_timeline_v2 && data.data.bookmark_timeline_v2.timeline && data.data.bookmark_timeline_v2.timeline.instructions)
      || (data && data.data && data.data.bookmark_timeline && data.data.bookmark_timeline.timeline && data.data.bookmark_timeline.timeline.instructions)
      || [];

    return parseTimelineEntries(instructions, seenMap);
  }

  function parseLists(data, seenMap) {
    var lists = [];
    var instructions = (data && data.data && data.data.viewer && data.data.viewer.list_management_timeline && data.data.viewer.list_management_timeline.timeline && data.data.viewer.list_management_timeline.timeline.instructions)
      || (data && data.data && data.data.viewer_v2 && data.data.viewer_v2.user_results && data.data.viewer_v2.user_results.result && data.data.viewer_v2.user_results.result.list_management_timeline && data.data.viewer_v2.user_results.result.list_management_timeline.timeline && data.data.viewer_v2.user_results.result.list_management_timeline.timeline.instructions)
      || (data && data.data && data.data.list_management_timeline && data.data.list_management_timeline.timeline && data.data.list_management_timeline.timeline.instructions)
      || [];

    for (var instIndex = 0; instIndex < instructions.length; instIndex += 1) {
      var instruction = instructions[instIndex];
      var entries = instruction.entries || [];

      for (var entryIndex = 0; entryIndex < entries.length; entryIndex += 1) {
        var entry = entries[entryIndex];
        var list = (entry.content && entry.content.itemContent && entry.content.itemContent.list)
          || (entry.content && entry.content.list)
          || (entry.item && entry.item.itemContent && entry.item.itemContent.list);

        if (!list) {
          continue;
        }

        var id = String(list.id_str || list.id || '');
        if (!id || seenMap[id]) {
          continue;
        }

        seenMap[id] = true;
        lists.push({
          id: id,
          name: list.name || '',
          members: String(list.member_count || 0),
          followers: String(list.subscriber_count || 0),
          mode: typeof list.mode === 'string' && /private/i.test(list.mode) ? 'private' : 'public'
        });
      }
    }

    return lists;
  }

  function parseListTweets(data, seenMap) {
    var instructions = (data && data.data && data.data.list && data.data.list.tweets_timeline && data.data.list.tweets_timeline.timeline && data.data.list.tweets_timeline.timeline.instructions) || [];
    return parseTimelineEntries(instructions, seenMap);
  }

  async function collectPagedTweets(fetchPage, limit, maxPages) {
    var items = [];
    var seenMap = {};
    var cursor = null;

    for (var pageIndex = 0; pageIndex < maxPages && items.length < limit; pageIndex += 1) {
      var pageResult = await fetchPage(cursor, items.length);
      items = items.concat(pageResult.items);
      if (!pageResult.nextCursor || pageResult.nextCursor === cursor) {
        break;
      }
      cursor = pageResult.nextCursor;
    }

    return {
      items: items.slice(0, limit),
      seenMap: seenMap
    };
  }

  window.__mediauseTwitter = {
    accountHealth: async function () {
      try {
        var loggedInUsername = helpers.getLoggedInUsername();
        var loggedIn = !!helpers.getCsrfToken();
        return helpers.ok({
          healthy: loggedIn,
          account: {
            id: loggedInUsername || null,
            nick: loggedInUsername || null,
            login: loggedIn
          }
        });
      } catch (error) {
        return helpers.fail('twitter.account.health_failed', 'account health failed', String(error));
      }
    },

    searchPosts: async function (payload) {
      try {
        var query = String(payload.query || '').trim();
        if (!query) {
          return invalidArgument('query is required for search.posts');
        }
        var filter = payload.filter === 'live' ? 'live' : 'top';
        var limit = helpers.toPositiveInt(payload.limit, 20, 50);
        if (window.location.pathname.indexOf('/search') !== 0) {
          var searchPath = '/search?q=' + encodeURIComponent(query) + '&src=typed_query&f=' + filter;
          try {
            window.history.pushState({}, '', searchPath);
            window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
            await helpers.sleep(1800);
          } catch (error) {
            window.location.assign('https://x.com' + searchPath);
            await helpers.sleep(2200);
          }
        }
        var items = helpers.extractTweetCards(limit);
        if (items.length < limit) {
          window.scrollBy(0, Math.max(window.innerHeight, 1200));
          await helpers.sleep(1200);
          items = helpers.extractTweetCards(limit);
        }
        return helpers.ok({
          query: query,
          filter: filter,
          items: items.slice(0, limit)
        });
      } catch (error) {
        return helpers.fail('twitter.search.posts_failed', 'search posts failed', String(error));
      }
    },

    searchTrending: async function (payload) {
      try {
        var limit = helpers.toPositiveInt(payload.limit, 20, 50);
        var cells = document.querySelectorAll('[data-testid="trend"]');
        var items = [];
        for (var index = 0; index < cells.length; index += 1) {
          var cell = cells[index];
          var text = String(cell.textContent || '');
          if (text.indexOf('Promoted') >= 0) {
            continue;
          }
          var container = cell.querySelector(':scope > div');
          if (!container || container.children.length < 2) {
            continue;
          }
          var topic = String(container.children[1].textContent || '').trim();
          if (!topic) {
            continue;
          }
          var category = String(container.children[0].textContent || '')
            .replace(/^\d+\s*/, '')
            .replace(/^\xB7\s*/, '')
            .trim();
          items.push({
            rank: items.length + 1,
            topic: topic,
            category: category
          });
          if (items.length >= limit) {
            break;
          }
        }
        return helpers.ok({ items: items });
      } catch (error) {
        return helpers.fail('twitter.search.trending_failed', 'search trending failed', String(error));
      }
    },

    userProfile: async function (payload) {
      try {
        var resolved = await resolveUser(payload.username);
        var result = resolved.result;
        var legacy = result.legacy || {};
        var expandedUrl = legacy.entities && legacy.entities.url && legacy.entities.url.urls && legacy.entities.url.urls[0]
          ? legacy.entities.url.urls[0].expanded_url || ''
          : '';
        return helpers.ok({
          screen_name: legacy.screen_name || helpers.normalizeScreenName(payload.username),
          name: legacy.name || '',
          bio: legacy.description || '',
          location: legacy.location || '',
          url: expandedUrl,
          followers: legacy.followers_count || 0,
          following: legacy.friends_count || 0,
          tweets: legacy.statuses_count || 0,
          likes: legacy.favourites_count || 0,
          verified: result.is_blue_verified || legacy.verified || false,
          created_at: legacy.created_at || ''
        });
      } catch (error) {
        return helpers.fail('twitter.user.profile_failed', 'user profile failed', String(error));
      }
    },

    userFeed: async function (payload) {
      try {
        var limit = helpers.toPositiveInt(payload.limit, 20, 100);
        var resolved = await resolveUser(payload.username);
        var seenMap = {};
        var items = [];
        var cursor = null;
        for (var pageIndex = 0; pageIndex < 5 && items.length < limit; pageIndex += 1) {
          var response = await helpers.fetchGraphql({
            operationName: 'UserTweets',
            endpoint: 'UserTweets',
            fallbackQueryId: USER_TWEETS_QUERY_ID,
            variables: {
              userId: resolved.userId,
              count: Math.min(100, limit - items.length + 10),
              includePromotedContent: false,
              withQuickPromoteEligibilityTweetFields: true,
              withVoice: true,
              cursor: cursor || undefined
            },
            features: USER_TWEETS_FEATURES
          });
          var parsed = parseUserTweets(response, seenMap);
          items = items.concat(parsed.tweets);
          if (!parsed.nextCursor || parsed.nextCursor === cursor) {
            break;
          }
          cursor = parsed.nextCursor;
        }
        return helpers.ok({ items: items.slice(0, limit) });
      } catch (error) {
        return helpers.fail('twitter.user.feed_failed', 'user feed failed', String(error));
      }
    },

    userFollowers: async function (payload) {
      try {
        var limit = helpers.toPositiveInt(payload.limit, 20, 100);
        var seenMap = {};
        var items = helpers.extractFollowersFromDom();
        for (var index = 0; index < items.length; index += 1) {
          seenMap[items[index].screen_name] = true;
        }

        for (var scrollIndex = 0; scrollIndex < 3 && items.length < limit; scrollIndex += 1) {
          window.scrollBy(0, Math.max(window.innerHeight, 1200));
          await helpers.sleep(1000);
          var newItems = helpers.extractFollowersFromDom();
          for (var newIndex = 0; newIndex < newItems.length; newIndex += 1) {
            if (!seenMap[newItems[newIndex].screen_name]) {
              seenMap[newItems[newIndex].screen_name] = true;
              items.push(newItems[newIndex]);
            }
          }
        }
        return helpers.ok({ items: items.slice(0, limit) });
      } catch (error) {
        return helpers.fail('twitter.user.followers_failed', 'user followers failed', String(error));
      }
    },

    userFollowing: async function (payload) {
      try {
        var limit = helpers.toPositiveInt(payload.limit, 20, 100);
        var resolved = await resolveUser(payload.username);
        var items = [];
        var seenMap = {};
        var cursor = null;
        for (var pageIndex = 0; pageIndex < 5 && items.length < limit; pageIndex += 1) {
          var response = await helpers.fetchGraphql({
            operationName: 'Following',
            endpoint: 'Following',
            fallbackQueryId: FOLLOWING_QUERY_ID,
            variables: {
              userId: resolved.userId,
              count: Math.min(50, limit - items.length + 10),
              includePromotedContent: false,
              withClientEventToken: false,
              withBirdwatchNotes: false,
              withVoice: true,
              withV2Timeline: true,
              cursor: cursor || undefined
            },
            features: FOLLOWING_FEATURES
          });
          var parsed = parseFollowing(response);
          for (var userIndex = 0; userIndex < parsed.users.length; userIndex += 1) {
            var user = parsed.users[userIndex];
            if (!seenMap[user.screen_name]) {
              seenMap[user.screen_name] = true;
              items.push(user);
            }
          }
          if (!parsed.nextCursor || parsed.nextCursor === cursor) {
            break;
          }
          cursor = parsed.nextCursor;
        }
        return helpers.ok({ items: items.slice(0, limit) });
      } catch (error) {
        return helpers.fail('twitter.user.following_failed', 'user following failed', String(error));
      }
    },

    userLikes: async function (payload) {
      try {
        var limit = helpers.toPositiveInt(payload.limit, 20, 100);
        var resolved = await resolveUser(payload.username);
        var items = [];
        var seenMap = {};
        var cursor = null;
        for (var pageIndex = 0; pageIndex < 5 && items.length < limit; pageIndex += 1) {
          var response = await helpers.fetchGraphql({
            operationName: 'Likes',
            endpoint: 'Likes',
            fallbackQueryId: LIKES_QUERY_ID,
            variables: {
              userId: resolved.userId,
              count: Math.min(100, limit - items.length + 10),
              includePromotedContent: false,
              withClientEventToken: false,
              withBirdwatchNotes: false,
              withVoice: true,
              cursor: cursor || undefined
            },
            features: FOLLOWING_FEATURES
          });
          var parsed = parseUserTweets(response, seenMap);
          items = items.concat(parsed.tweets);
          if (!parsed.nextCursor || parsed.nextCursor === cursor) {
            break;
          }
          cursor = parsed.nextCursor;
        }
        return helpers.ok({ items: items.slice(0, limit) });
      } catch (error) {
        return helpers.fail('twitter.user.likes_failed', 'user likes failed', String(error));
      }
    },

    getTimeline: async function (payload) {
      try {
        var limit = helpers.toPositiveInt(payload.limit, 20, 100);
        var type = payload.type === 'following' ? 'following' : 'for-you';
        var endpoint = type === 'following' ? 'HomeLatestTimeline' : 'HomeTimeline';
        var operationName = endpoint;
        var fallbackQueryId = type === 'following' ? HOME_LATEST_TIMELINE_QUERY_ID : HOME_TIMELINE_QUERY_ID;
        var method = type === 'following' ? 'POST' : 'GET';
        var items = [];
        var seenMap = {};
        var cursor = null;

        for (var pageIndex = 0; pageIndex < 5 && items.length < limit; pageIndex += 1) {
          var response = await helpers.fetchGraphql({
            operationName: operationName,
            endpoint: endpoint,
            fallbackQueryId: fallbackQueryId,
            variables: {
              count: Math.min(40, limit - items.length + 5),
              includePromotedContent: false,
              latestControlAvailable: true,
              requestContext: 'launch',
              withCommunity: type === 'for-you' ? true : undefined,
              seenTweetIds: type === 'following' ? [] : undefined,
              cursor: cursor || undefined
            },
            features: TIMELINE_FEATURES,
            method: method
          });
          var instructions = (response && response.data && response.data.home && response.data.home.home_timeline_urt && response.data.home.home_timeline_urt.instructions) || [];
          var parsed = parseTimelineEntries(instructions, seenMap);
          items = items.concat(parsed.tweets);
          if (!parsed.nextCursor || parsed.nextCursor === cursor) {
            break;
          }
          cursor = parsed.nextCursor;
        }

        return helpers.ok({ type: type, items: items.slice(0, limit) });
      } catch (error) {
        return helpers.fail('twitter.get.timeline_failed', 'get timeline failed', String(error));
      }
    },

    getBookmarks: async function (payload) {
      try {
        var limit = helpers.toPositiveInt(payload.limit, 20, 100);
        var items = [];
        var seenMap = {};
        var cursor = null;

        for (var pageIndex = 0; pageIndex < 5 && items.length < limit; pageIndex += 1) {
          var response = await helpers.fetchGraphql({
            operationName: 'Bookmarks',
            endpoint: 'Bookmarks',
            fallbackQueryId: BOOKMARKS_QUERY_ID,
            variables: {
              count: Math.min(100, limit - items.length + 10),
              includePromotedContent: false,
              cursor: cursor || undefined
            },
            features: BOOKMARKS_FEATURES
          });
          var parsed = parseBookmarks(response, seenMap);
          items = items.concat(parsed.tweets);
          if (!parsed.nextCursor || parsed.nextCursor === cursor) {
            break;
          }
          cursor = parsed.nextCursor;
        }

        return helpers.ok({ items: items.slice(0, limit) });
      } catch (error) {
        return helpers.fail('twitter.get.bookmarks_failed', 'get bookmarks failed', String(error));
      }
    },

    listFeed: async function (payload) {
      try {
        var limit = helpers.toPositiveInt(payload.limit, 50, 100);
        var response = await helpers.fetchGraphql({
          operationName: 'ListsManagementPageTimeline',
          endpoint: 'ListsManagementPageTimeline',
          fallbackQueryId: LISTS_QUERY_ID,
          features: LISTS_FEATURES
        });
        return helpers.ok({
          items: parseLists(response, {}).slice(0, limit)
        });
      } catch (error) {
        return helpers.fail('twitter.list.feed_failed', 'list feed failed', String(error));
      }
    },

    listTweets: async function (payload) {
      try {
        var listId = String(payload.list_id || '').trim();
        if (!/^\d+$/.test(listId)) {
          return invalidArgument('list_id must be a numeric twitter list id');
        }
        var limit = helpers.toPositiveInt(payload.limit, 50, 100);
        var items = [];
        var seenMap = {};
        var cursor = null;
        for (var pageIndex = 0; pageIndex < 10 && items.length < limit; pageIndex += 1) {
          var response = await helpers.fetchGraphql({
            operationName: 'ListLatestTweetsTimeline',
            endpoint: 'ListLatestTweetsTimeline',
            fallbackQueryId: LIST_TWEETS_QUERY_ID,
            variables: {
              listId: listId,
              count: Math.min(100, limit - items.length + 10),
              cursor: cursor || undefined
            },
            features: LIST_TWEETS_FEATURES
          });
          var parsed = parseListTweets(response, seenMap);
          items = items.concat(parsed.tweets);
          if (!parsed.nextCursor || parsed.nextCursor === cursor) {
            break;
          }
          cursor = parsed.nextCursor;
        }
        return helpers.ok({ items: items.slice(0, limit) });
      } catch (error) {
        return helpers.fail('twitter.list.tweets_failed', 'list tweets failed', String(error));
      }
    },

    postFeed: async function (payload) {
      try {
        var text = String(payload.text || '').trim();
        if (!text) {
          return invalidArgument('text is required for post.feed');
        }
        await helpers.insertComposerText(text);
        await helpers.clickComposerSubmit();
        return helpers.ok({
          status: 'success',
          message: 'Tweet posted successfully.',
          text: text
        });
      } catch (error) {
        return helpers.fail('twitter.post.feed_failed', 'post feed failed', String(error));
      }
    },

    postReply: async function (payload) {
      try {
        var text = String(payload.text || '').trim();
        if (!text) {
          return invalidArgument('text is required for post.reply');
        }
        var replyButton = await helpers.waitForSelector('[data-testid="reply"]', 20, 400);
        if (!replyButton) {
          throw new Error('Could not find the reply button on the target tweet.');
        }
        replyButton.click();
        await helpers.sleep(1000);
        var composer = await helpers.waitForSelector('[data-testid="tweetTextarea_0"]', 20, 400);
        if (!composer) {
          throw new Error('Reply composer did not appear.');
        }
        await helpers.insertComposerText(text);
        await helpers.clickComposerSubmit();
        return helpers.ok({
          status: 'success',
          message: 'Reply posted successfully.',
          text: text,
          url: payload.url || ''
        });
      } catch (error) {
        return helpers.fail('twitter.post.reply_failed', 'post reply failed', String(error));
      }
    },

    engageLike: async function () {
      try {
        var result = await helpers.toggleAction({
          alreadySelector: '[data-testid="unlike"]',
          alreadyMessage: 'Tweet is already liked.',
          actionSelector: '[data-testid="like"]',
          verifySelector: '[data-testid="unlike"]',
          successMessage: 'Tweet successfully liked.',
          failureMessage: 'Could not find the Like button on this tweet.'
        });
        return helpers.ok({
          status: 'success',
          message: result.message
        });
      } catch (error) {
        return helpers.fail('twitter.engage.like_failed', 'engage like failed', String(error));
      }
    },

    engageBookmark: async function () {
      try {
        var result = await helpers.toggleAction({
          alreadySelector: '[data-testid="removeBookmark"]',
          alreadyMessage: 'Tweet is already bookmarked.',
          actionSelector: '[data-testid="bookmark"]',
          verifySelector: '[data-testid="removeBookmark"]',
          successMessage: 'Tweet successfully bookmarked.',
          failureMessage: 'Could not find the Bookmark button on this tweet.'
        });
        return helpers.ok({
          status: 'success',
          message: result.message
        });
      } catch (error) {
        return helpers.fail('twitter.engage.bookmark_failed', 'engage bookmark failed', String(error));
      }
    },

    engageFollow: async function (payload) {
      try {
        var username = helpers.normalizeScreenName(payload.username);
        if (!username) {
          return invalidArgument('username is required for engage.follow');
        }
        var result = await helpers.toggleAction({
          alreadySelector: '[data-testid$="-unfollow"]',
          alreadyMessage: 'Already following @' + username + '.',
          actionSelector: '[data-testid$="-follow"]',
          verifySelector: '[data-testid$="-unfollow"]',
          successMessage: 'Successfully followed @' + username + '.',
          failureMessage: 'Could not find Follow button. Are you logged in?'
        });
        return helpers.ok({
          status: 'success',
          message: result.message,
          username: username
        });
      } catch (error) {
        return helpers.fail('twitter.engage.follow_failed', 'engage follow failed', String(error));
      }
    }
  };
})();