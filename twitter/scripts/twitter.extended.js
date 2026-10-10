(function () {
  var helpers = window.__mediauseTwitterHelpers;
  var api = window.__mediauseTwitter;

  if (!helpers || !api) {
    return;
  }

  var USER_BY_SCREEN_NAME_QUERY_ID = 'qRednkZG-rn1P6b48NINmQ';
  var LISTS_QUERY_ID = '78UbkyXwXBD98IgUWXOy9g';

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

  var LISTS_FEATURES = {
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

  function fail(code, message, details) {
    return helpers.fail(code, message, details);
  }

  function ok(data) {
    return helpers.ok(data);
  }

  function invalidArgument(message) {
    return fail('twitter.invalid_argument', message);
  }

  function normalizeName(value) {
    return helpers.normalizeScreenName(value);
  }

  function uniqueBy(items, keyName) {
    var out = [];
    var seen = {};
    for (var index = 0; index < items.length; index += 1) {
      var item = items[index];
      var key = item && item[keyName] ? String(item[keyName]) : '';
      if (!key || seen[key]) {
        continue;
      }
      seen[key] = true;
      out.push(item);
    }
    return out;
  }

  function collectNotifications(limit) {
    var rows = document.querySelectorAll('[data-testid="cellInnerDiv"], article');
    var items = [];
    for (var index = 0; index < rows.length; index += 1) {
      var row = rows[index];
      var hrefElement = row.querySelector('a[href*="/status/"]');
      if (!hrefElement) {
        continue;
      }
      var href = hrefElement.getAttribute('href') || '';
      var idMatch = href.match(/\/status\/(\d+)/);
      var authorMatch = href.match(/^\/([^\/]+)\/status\//);
      var textElement = row.querySelector('[data-testid="tweetText"]') || row.querySelector('[lang]');
      items.push({
        id: idMatch ? idMatch[1] : String(index + 1),
        action: 'notification',
        author: authorMatch ? authorMatch[1] : 'unknown',
        text: textElement ? String(textElement.innerText || textElement.textContent || '').trim() : String(row.innerText || '').trim().slice(0, 240),
        url: 'https://x.com' + href
      });
      if (items.length >= limit) {
        break;
      }
    }
    return uniqueBy(items, 'id').slice(0, limit);
  }

  async function resolveUserId(username) {
    var normalized = normalizeName(username);
    if (!normalized) {
      throw new Error('username is required');
    }

    var data = await helpers.fetchGraphql({
      operationName: 'UserByScreenName',
      endpoint: 'UserByScreenName',
      fallbackQueryId: USER_BY_SCREEN_NAME_QUERY_ID,
      variables: {
        screen_name: normalized,
        withSafetyModeUserFields: true
      },
      features: USER_BY_SCREEN_NAME_FEATURES
    });

    var result = data && data.data && data.data.user && data.data.user.result;
    if (!result || !result.rest_id) {
      throw new Error('Could not resolve @' + normalized);
    }

    return result.rest_id;
  }

  function parseListsResponse(data) {
    var lists = [];
    var instructions = (data && data.data && data.data.viewer && data.data.viewer.list_management_timeline && data.data.viewer.list_management_timeline.timeline && data.data.viewer.list_management_timeline.timeline.instructions)
      || (data && data.data && data.data.viewer_v2 && data.data.viewer_v2.user_results && data.data.viewer_v2.user_results.result && data.data.viewer_v2.user_results.result.list_management_timeline && data.data.viewer_v2.user_results.result.list_management_timeline.timeline && data.data.viewer_v2.user_results.result.list_management_timeline.timeline.instructions)
      || (data && data.data && data.data.list_management_timeline && data.data.list_management_timeline.timeline && data.data.list_management_timeline.timeline.instructions)
      || [];

    for (var i = 0; i < instructions.length; i += 1) {
      var entries = instructions[i].entries || [];
      for (var j = 0; j < entries.length; j += 1) {
        var entry = entries[j];
        var list = (entry.content && entry.content.itemContent && entry.content.itemContent.list)
          || (entry.content && entry.content.list)
          || (entry.item && entry.item.itemContent && entry.item.itemContent.list);
        if (!list) {
          continue;
        }
        lists.push({
          id: String(list.id_str || list.id || ''),
          name: String(list.name || '').trim()
        });
      }
    }

    return uniqueBy(lists, 'id');
  }

  async function findListNameById(listId) {
    var data = await helpers.fetchGraphql({
      operationName: 'ListsManagementPageTimeline',
      endpoint: 'ListsManagementPageTimeline',
      fallbackQueryId: LISTS_QUERY_ID,
      features: LISTS_FEATURES
    });
    var lists = parseListsResponse(data);
    var hit = lists.find(function (item) {
      return item.id === String(listId);
    });
    return hit ? hit.name : '';
  }

  async function openAddRemoveListDialog() {
    var menuButton = await helpers.waitForSelector('[data-testid="userActions"]', 20, 300);
    if (!menuButton) {
      throw new Error('Could not find user actions menu.');
    }
    menuButton.click();
    await helpers.sleep(700);

    var items = document.querySelectorAll('[role="menuitem"]');
    var target = null;
    for (var i = 0; i < items.length; i += 1) {
      var text = String(items[i].innerText || '').toLowerCase();
      if (/add\/remove|add to list|list/.test(text)) {
        target = items[i];
        break;
      }
    }
    if (!target) {
      throw new Error('Could not find add/remove list menu item.');
    }

    target.click();
    await helpers.sleep(1200);

    var dialog = await helpers.waitForSelector('[role="dialog"]', 15, 300);
    if (!dialog) {
      throw new Error('List dialog did not appear.');
    }
    return dialog;
  }

  async function toggleListMembership(targetName, shouldBeMember) {
    var dialog = await openAddRemoveListDialog();
    var rows = dialog.querySelectorAll('[data-testid="cellInnerDiv"]');
    var row = null;

    for (var i = 0; i < rows.length; i += 1) {
      var rowName = String(rows[i].innerText || '').split('\n')[0].trim();
      if (rowName === targetName) {
        row = rows[i];
        break;
      }
    }

    if (!row) {
      throw new Error('Target list not found in dialog: ' + targetName);
    }

    var listCell = row.querySelector('[data-testid="listCell"]') || row.querySelector('[role="checkbox"]') || row;
    var checked = String(listCell.getAttribute('aria-checked') || '').toLowerCase() === 'true';

    if (checked !== shouldBeMember) {
      listCell.click();
      await helpers.sleep(400);
    }

    var saveButton = Array.prototype.slice.call(dialog.querySelectorAll('[role="button"], button')).find(function (button) {
      var text = String(button.innerText || '').trim().toLowerCase();
      return text === 'save' || text === 'done' || text === '保存' || text === '完成' || text === '儲存';
    });

    if (!saveButton) {
      throw new Error('Save button not found in list dialog.');
    }

    saveButton.click();
    await helpers.sleep(1800);

    return {
      changed: checked !== shouldBeMember
    };
  }

  async function clickMenuActionByRegex(regex) {
    var menuButton = await helpers.waitForSelector('[data-testid="userActions"], [aria-label="More"]', 20, 300);
    if (!menuButton) {
      throw new Error('Could not find menu button.');
    }
    menuButton.click();
    await helpers.sleep(700);

    var items = document.querySelectorAll('[role="menuitem"]');
    var target = null;
    for (var index = 0; index < items.length; index += 1) {
      if (regex.test(String(items[index].innerText || ''))) {
        target = items[index];
        break;
      }
    }

    if (!target) {
      throw new Error('Menu action not found.');
    }

    target.click();
    await helpers.sleep(700);

    var confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
    if (confirm) {
      confirm.click();
      await helpers.sleep(1200);
    }
  }

  function collectConversations(selector) {
    var rows = document.querySelectorAll(selector);
    var conversations = [];
    for (var index = 0; index < rows.length; index += 1) {
      var row = rows[index];
      conversations.push({
        index: index,
        text: String(row.innerText || ''),
        user: String(row.innerText || '').split('\n')[0] || 'Unknown'
      });
    }
    return conversations;
  }

  api.getNotifications = async function (payload) {
    try {
      var limit = helpers.toPositiveInt(payload.limit, 20, 100);
      return ok({ items: collectNotifications(limit) });
    } catch (error) {
      return fail('twitter.get.notifications_failed', 'get notifications failed', String(error));
    }
  };

  api.listAdd = async function (payload) {
    try {
      var listId = String(payload.list_id || '').trim();
      var username = normalizeName(payload.username);
      if (!/^\d+$/.test(listId)) {
        return invalidArgument('list_id must be a numeric twitter list id');
      }
      if (!username) {
        return invalidArgument('username is required for list.add');
      }
      await resolveUserId(username);
      var listName = await findListNameById(listId);
      if (!listName) {
        throw new Error('Could not resolve list name by id: ' + listId);
      }
      var result = await toggleListMembership(listName, true);
      return ok({
        list_id: listId,
        username: username,
        status: 'success',
        changed: result.changed,
        message: result.changed ? 'User added to list.' : 'User already in list.'
      });
    } catch (error) {
      return fail('twitter.list.add_failed', 'list add failed', String(error));
    }
  };

  api.listRemove = async function (payload) {
    try {
      var listId = String(payload.list_id || '').trim();
      var username = normalizeName(payload.username);
      if (!/^\d+$/.test(listId)) {
        return invalidArgument('list_id must be a numeric twitter list id');
      }
      if (!username) {
        return invalidArgument('username is required for list.remove');
      }
      await resolveUserId(username);
      var listName = await findListNameById(listId);
      if (!listName) {
        throw new Error('Could not resolve list name by id: ' + listId);
      }
      var result = await toggleListMembership(listName, false);
      return ok({
        list_id: listId,
        username: username,
        status: 'success',
        changed: result.changed,
        message: result.changed ? 'User removed from list.' : 'User already not in list.'
      });
    } catch (error) {
      return fail('twitter.list.remove_failed', 'list remove failed', String(error));
    }
  };

  api.engageUnbookmark = async function () {
    try {
      var result = await helpers.toggleAction({
        alreadySelector: '[data-testid="bookmark"]',
        alreadyMessage: 'Tweet is not bookmarked (already removed).',
        actionSelector: '[data-testid="removeBookmark"]',
        verifySelector: '[data-testid="bookmark"]',
        successMessage: 'Tweet successfully removed from bookmarks.',
        failureMessage: 'Could not find Remove Bookmark button.'
      });
      return ok({ status: 'success', message: result.message });
    } catch (error) {
      return fail('twitter.engage.unbookmark_failed', 'engage unbookmark failed', String(error));
    }
  };

  api.engageUnfollow = async function (payload) {
    try {
      var username = normalizeName(payload.username);
      if (!username) {
        return invalidArgument('username is required for engage.unfollow');
      }
      var result = await helpers.toggleAction({
        alreadySelector: '[data-testid$="-follow"]',
        alreadyMessage: 'Not following @' + username + ' (already unfollowed).',
        actionSelector: '[data-testid$="-unfollow"]',
        verifySelector: '[data-testid$="-follow"]',
        successMessage: 'Successfully unfollowed @' + username + '.',
        failureMessage: 'Could not find Unfollow button.'
      });
      return ok({ status: 'success', message: result.message, username: username });
    } catch (error) {
      return fail('twitter.engage.unfollow_failed', 'engage unfollow failed', String(error));
    }
  };

  api.moderateDelete = async function (payload) {
    try {
      helpers.parseStatusUrl(payload.url);
      await clickMenuActionByRegex(/delete/i);
      return ok({ status: 'success', message: 'Tweet successfully deleted.', url: payload.url || '' });
    } catch (error) {
      return fail('twitter.moderate.delete_failed', 'moderate delete failed', String(error));
    }
  };

  api.moderateHideReply = async function (payload) {
    try {
      helpers.parseStatusUrl(payload.url);
      await clickMenuActionByRegex(/hide reply/i);
      return ok({ status: 'success', message: 'Reply successfully hidden.', url: payload.url || '' });
    } catch (error) {
      return fail('twitter.moderate.hide_reply_failed', 'moderate hide reply failed', String(error));
    }
  };

  api.moderateBlock = async function (payload) {
    try {
      var username = normalizeName(payload.username);
      if (!username) {
        return invalidArgument('username is required for moderate.block');
      }
      if (document.querySelector('[data-testid$="-unblock"]')) {
        return ok({ status: 'success', message: 'Already blocking @' + username + '.', username: username });
      }
      await clickMenuActionByRegex(/block/i);
      return ok({ status: 'success', message: 'Successfully blocked @' + username + '.', username: username });
    } catch (error) {
      return fail('twitter.moderate.block_failed', 'moderate block failed', String(error));
    }
  };

  api.moderateUnblock = async function (payload) {
    try {
      var username = normalizeName(payload.username);
      if (!username) {
        return invalidArgument('username is required for moderate.unblock');
      }
      if (document.querySelector('[data-testid$="-follow"]')) {
        return ok({ status: 'success', message: 'Not blocking @' + username + ' (already unblocked).', username: username });
      }
      var unblockButton = document.querySelector('[data-testid$="-unblock"]');
      if (!unblockButton) {
        throw new Error('Could not find Unblock button.');
      }
      unblockButton.click();
      await helpers.sleep(700);
      var confirm = document.querySelector('[data-testid="confirmationSheetConfirm"]');
      if (confirm) {
        confirm.click();
        await helpers.sleep(1000);
      }
      return ok({ status: 'success', message: 'Successfully unblocked @' + username + '.', username: username });
    } catch (error) {
      return fail('twitter.moderate.unblock_failed', 'moderate unblock failed', String(error));
    }
  };

  api.messageAccept = async function (payload) {
    try {
      var query = String(payload.query || '').trim();
      if (!query) {
        return invalidArgument('query is required for message.accept');
      }
      var maxCount = helpers.toPositiveInt(payload.max, 20, 200);
      var keywords = query.split(',').map(function (item) {
        return item.trim();
      }).filter(Boolean);

      var conversations = collectConversations('[data-testid="conversation"]');
      var out = [];
      var accepted = 0;
      for (var index = 0; index < conversations.length && accepted < maxCount; index += 1) {
        var conv = conversations[index];
        var matched = keywords.some(function (keyword) {
          return conv.text.indexOf(keyword) >= 0;
        });
        if (!matched) {
          continue;
        }
        var row = document.querySelectorAll('[data-testid="conversation"]')[conv.index];
        if (!row) {
          continue;
        }
        row.click();
        await helpers.sleep(1100);
        var buttons = document.querySelectorAll('[role="button"]');
        var acceptButton = Array.prototype.slice.call(buttons).find(function (button) {
          var text = String(button.innerText || '').trim().toLowerCase();
          return text === 'accept' || text === '接受';
        });
        if (!acceptButton) {
          continue;
        }
        acceptButton.click();
        await helpers.sleep(900);
        var confirmButton = document.querySelector('[data-testid="confirmationSheetConfirm"]');
        if (confirmButton) {
          confirmButton.click();
          await helpers.sleep(700);
        }
        accepted += 1;
        out.push({ index: accepted, status: 'accepted', user: conv.user, message: 'Accepted by keyword match.' });
      }

      if (out.length === 0) {
        out.push({ index: 0, status: 'info', user: 'System', message: 'No requests matched keywords.' });
      }

      return ok({ items: out });
    } catch (error) {
      return fail('twitter.message.accept_failed', 'message accept failed', String(error));
    }
  };

  api.messageReply = async function (payload) {
    try {
      var text = String(payload.text || '').trim();
      if (!text) {
        return invalidArgument('text is required for message.reply');
      }
      var maxCount = helpers.toPositiveInt(payload.max, 20, 200);
      var skipReplied = payload.skip_replied !== false;
      var conversations = collectConversations('[data-testid^="dm-conversation-item-"], [data-testid="conversation"]');
      var out = [];
      var sent = 0;

      for (var index = 0; index < conversations.length && sent < maxCount; index += 1) {
        var row = document.querySelectorAll('[data-testid^="dm-conversation-item-"], [data-testid="conversation"]')[conversations[index].index];
        if (!row) {
          continue;
        }
        row.click();
        await helpers.sleep(1000);

        if (skipReplied) {
          var chatText = String((document.querySelector('[data-testid="DmScrollerContainer"]') || document.querySelector('main') || {}).innerText || '');
          if (chatText.indexOf(text) >= 0) {
            out.push({ index: out.length + 1, status: 'skipped', user: conversations[index].user, message: 'Already sent this message.' });
            continue;
          }
        }

        var input = document.querySelector('[data-testid="dmComposerTextInput"]');
        if (!input) {
          continue;
        }
        input.focus();
        await helpers.sleep(200);
        if (!document.execCommand('insertText', false, text)) {
          var transfer = new DataTransfer();
          transfer.setData('text/plain', text);
          input.dispatchEvent(new ClipboardEvent('paste', {
            clipboardData: transfer,
            bubbles: true,
            cancelable: true
          }));
        }
        await helpers.sleep(300);

        var sendButton = document.querySelector('[data-testid="dmComposerSendButton"]');
        if (!sendButton) {
          continue;
        }
        sendButton.click();
        await helpers.sleep(800);
        sent += 1;
        out.push({ index: sent, status: 'sent', user: conversations[index].user, message: 'Message sent.' });
      }

      if (out.length === 0) {
        out.push({ index: 0, status: 'info', user: 'System', message: 'No conversations processed.' });
      }

      return ok({ items: out });
    } catch (error) {
      return fail('twitter.message.reply_failed', 'message reply failed', String(error));
    }
  };
})();
