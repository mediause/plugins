(function () {
  function asErr(code, message, details) {
    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  async function callSite(methodName, payload) {
    if (typeof window.__mediauseChatgpt !== 'object' || window.__mediauseChatgpt === null) {
      return asErr('chatgpt.bridge.not_ready', 'window.__mediauseChatgpt is not available');
    }

    var method = window.__mediauseChatgpt[methodName];
    if (typeof method !== 'function') {
      return asErr('chatgpt.bridge.handler_not_implemented', 'window.__mediauseChatgpt.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseChatgpt, payload || {});
    } catch (error) {
      return asErr('chatgpt.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseChatgptSiteBridge = {
    call: callSite
  };
})();
