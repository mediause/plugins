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
    if (typeof window.__mediauseBilibili !== 'object' || window.__mediauseBilibili === null) {
      return errorResult('bilibili.bridge.not_ready', 'window.__mediauseBilibili is not available');
    }

    var method = window.__mediauseBilibili[methodName];
    if (typeof method !== 'function') {
      return errorResult('bilibili.bridge.handler_not_implemented', 'window.__mediauseBilibili.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseBilibili, payload || {});
    } catch (error) {
      return errorResult('bilibili.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseBilibiliSiteBridge = {
    call: callSite
  };
})();
