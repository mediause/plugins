(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseBilibiliSiteBridge || typeof window.__mediauseBilibiliSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'bilibili.bridge.not_ready',
          message: 'window.__mediauseBilibiliSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseBilibiliSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'bilibili',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) { return forward('accountHealth', payload); },
      'get.dynamic': async function (payload) { return forward('getDynamic', payload); },
      'search.video': async function (payload) { return forward('searchVideo', payload); },
      'search.user': async function (payload) { return forward('searchUser', payload); },
      'get.hot': async function (payload) { return forward('getHot', payload); },
      'get.ranking': async function (payload) { return forward('getRanking', payload); },
      'get.history': async function (payload) { return forward('getHistory', payload); },
      'get.feed': async function (payload) { return forward('getFeed', payload); },
      'read.feed-detail': async function (payload) { return forward('readDynamic', payload); },
      'read.video': async function (payload) { return forward('readVideo', payload); },
      'read.subtitle': async function (payload) { return forward('readSubtitle', payload); },
      'read.summary': async function (payload) { return forward('readSummary', payload); },
      'read.comments': async function (payload) { return forward('readComments', payload); },
      'read.dynamic': async function (payload) { return forward('readDynamic', payload); },
      'user.me': async function (payload) { return forward('userMe', payload); },
      'user.profile': async function (payload) { return forward('userProfile', payload); },
      'user.following': async function (payload) { return forward('userFollowing', payload); },
      'user.videos': async function (payload) { return forward('userVideos', payload); },
      'user.feed': async function (payload) { return forward('userFeed', payload); },
      'collection.favorite': async function (payload) { return forward('collectionFavorite', payload); },
      'engage.comment': async function (payload) { return forward('engageComment', payload); }
    }
  });
})();
