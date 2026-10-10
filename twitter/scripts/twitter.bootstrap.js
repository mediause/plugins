(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseTwitterSiteBridge || typeof window.__mediauseTwitterSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'twitter.bridge.not_ready',
          message: 'window.__mediauseTwitterSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseTwitterSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'twitter',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return forward('accountHealth', payload);
      },
      'search.posts': async function (payload) {
        return forward('searchPosts', payload);
      },
      'search.trending': async function (payload) {
        return forward('searchTrending', payload);
      },
      'user.profile': async function (payload) {
        return forward('userProfile', payload);
      },
      'user.feed': async function (payload) {
        return forward('userFeed', payload);
      },
      'user.followers': async function (payload) {
        return forward('userFollowers', payload);
      },
      'user.following': async function (payload) {
        return forward('userFollowing', payload);
      },
      'user.likes': async function (payload) {
        return forward('userLikes', payload);
      },
      'get.timeline': async function (payload) {
        return forward('getTimeline', payload);
      },
      'get.bookmarks': async function (payload) {
        return forward('getBookmarks', payload);
      },
      'get.notifications': async function (payload) {
        return forward('getNotifications', payload);
      },
      'list.feed': async function (payload) {
        return forward('listFeed', payload);
      },
      'list.tweets': async function (payload) {
        return forward('listTweets', payload);
      },
      'list.add': async function (payload) {
        return forward('listAdd', payload);
      },
      'list.remove': async function (payload) {
        return forward('listRemove', payload);
      },
      'post.feed': async function (payload) {
        return forward('postFeed', payload);
      },
      'post.reply': async function (payload) {
        return forward('postReply', payload);
      },
      'engage.like': async function (payload) {
        return forward('engageLike', payload);
      },
      'engage.bookmark': async function (payload) {
        return forward('engageBookmark', payload);
      },
      'engage.follow': async function (payload) {
        return forward('engageFollow', payload);
      },
      'engage.unfollow': async function (payload) {
        return forward('engageUnfollow', payload);
      },
      'engage.unbookmark': async function (payload) {
        return forward('engageUnbookmark', payload);
      },
      'moderate.delete': async function (payload) {
        return forward('moderateDelete', payload);
      },
      'moderate.hide-reply': async function (payload) {
        return forward('moderateHideReply', payload);
      },
      'moderate.block': async function (payload) {
        return forward('moderateBlock', payload);
      },
      'moderate.unblock': async function (payload) {
        return forward('moderateUnblock', payload);
      },
      'message.accept': async function (payload) {
        return forward('messageAccept', payload);
      },
      'message.reply': async function (payload) {
        return forward('messageReply', payload);
      }
    }
  });
})();