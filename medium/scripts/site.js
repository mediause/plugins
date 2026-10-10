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
    if (typeof window.__mediauseMedium !== 'object' || window.__mediauseMedium === null) {
      return errorResult('medium.bridge.not_ready', 'window.__mediauseMedium is not available');
    }

    var method = window.__mediauseMedium[methodName];
    if (typeof method !== 'function') {
      return errorResult('medium.bridge.handler_not_implemented', 'window.__mediauseMedium.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseMedium, payload || {});
    } catch (error) {
      return errorResult('medium.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseMediumSiteBridge = {
    call: callSite
  };
})();
