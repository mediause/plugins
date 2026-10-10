(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'chatgpt',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('accountHealth', payload);
      },
      'chat.status': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('chatStatus', payload);
      },
      'chat.new': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('chatNew', payload);
      },
      'chat.send': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('chatSend', payload);
      },
      'chat.ask': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('chatAsk', payload);
      },
      'chat.read': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('chatRead', payload);
      },
      'chat.history': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('chatHistory', payload);
      },
      'chat.detail': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('chatDetail', payload);
      },
      'image.generate': async function (payload) {
        return window.__mediauseChatgptSiteBridge.call('imageGenerate', payload);
      }
    }
  });
})();
