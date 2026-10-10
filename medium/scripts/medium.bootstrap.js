(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'medium',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return window.__mediauseMediumSiteBridge.call('accountHealth', payload);
      },
      'get.feed': async function (payload) {
        return window.__mediauseMediumSiteBridge.call('getFeed', payload);
      },
      'get.tag': async function (payload) {
        return window.__mediauseMediumSiteBridge.call('getTag', payload);
      },
      'search.posts': async function (payload) {
        return window.__mediauseMediumSiteBridge.call('searchPosts', payload);
      },
      'read.item': async function (payload) {
        return window.__mediauseMediumSiteBridge.call('readItem', payload);
      },
      'user.posts': async function (payload) {
        return window.__mediauseMediumSiteBridge.call('userPosts', payload);
      }
    }
  });
})();
