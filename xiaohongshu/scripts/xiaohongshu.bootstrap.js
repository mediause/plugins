(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseXiaohongshuSiteBridge || typeof window.__mediauseXiaohongshuSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'xiaohongshu.bridge.not_ready',
          message: 'window.__mediauseXiaohongshuSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseXiaohongshuSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'xiaohongshu',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) { return forward('accountHealth', payload); },
      'post.feed': async function (payload) { return forward('postFeed', payload); },
      'post.repost': async function (payload) { return forward('postRepost', payload); },
      'get.feed': async function (payload) { return forward('getFeed', payload); },
      'get.detail': async function (payload) { return forward('getDetail', payload); },
      'get.notif': async function (payload) { return forward('getNotif', payload); },
      'user.profile': async function (payload) { return forward('userProfile', payload); },
      'user.profile-update': async function (payload) { return forward('userProfileUpdate', payload); },
      'user.feed': async function (payload) { return forward('userFeed', payload); },
      'user.followers': async function (payload) { return forward('userFollowers', payload); },
      'user.following': async function (payload) { return forward('userFollowing', payload); },
      'reply.comment': async function (payload) { return forward('replyComment', payload); },
      'reply.sub': async function (payload) { return forward('replySub', payload); },
      'reply.message': async function (payload) { return forward('replyMessage', payload); },
      'search.text': async function (payload) { return forward('searchText', payload); },
      'search.user': async function (payload) { return forward('searchUser', payload); },
      'search.hot': async function (payload) { return forward('searchHot', payload); },
      'engage.like': async function (payload) { return forward('engageLike', payload); },
      'engage.follow': async function (payload) { return forward('engageFollow', payload); },
      'engage.collect': async function (payload) { return forward('engageCollect', payload); },
      'manage.task': async function (payload) { return forward('manageTask', payload); },
      'trace.last': async function (payload) { return forward('traceLast', payload); },
      'note.boost': async function (payload) { return forward('noteBoost', payload); }
    }
  });
})();
