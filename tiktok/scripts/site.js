(function () {
  function errorResult(code, message, details) {
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
    if (typeof window.__mediauseTiktok !== 'object' || window.__mediauseTiktok === null) {
      return errorResult('tiktok.bridge.not_ready', 'window.__mediauseTiktok is not available');
    }

    var method = window.__mediauseTiktok[methodName];
    if (typeof method !== 'function') {
      return errorResult('tiktok.bridge.handler_not_implemented', 'window.__mediauseTiktok.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseTiktok, payload || {});
    } catch (error) {
      return errorResult('tiktok.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseTiktokSiteBridge = {
    call: callSite
  };
})();
