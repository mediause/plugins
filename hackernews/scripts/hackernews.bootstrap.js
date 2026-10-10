(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'hackernews',
    version: 'v1',
    handlers: {
      'get.top': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('getTop', payload);
      },
      'get.best': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('getBest', payload);
      },
      'get.ask': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('getAsk', payload);
      },
      'get.new': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('getNew', payload);
      },
      'get.show': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('getShow', payload);
      },
      'get.jobs': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('getJobs', payload);
      },
      'search.stories': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('searchStories', payload);
      },
      'read.item': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('readItem', payload);
      },
      'user.profile': async function (payload) {
        return window.__mediauseHackernewsSiteBridge.call('userProfile', payload);
      }
    }
  });
})();
