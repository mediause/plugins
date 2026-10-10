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
    if (typeof window.__mediauseSemrush !== 'object' || window.__mediauseSemrush === null) {
      return errorResult('semrush.bridge.not_ready', 'window.__mediauseSemrush is not available');
    }

    var method = window.__mediauseSemrush[methodName];
    if (typeof method !== 'function') {
      return errorResult('semrush.bridge.handler_not_implemented', 'window.__mediauseSemrush.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseSemrush, payload || {});
    } catch (error) {
      return errorResult('semrush.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseSemrushSiteBridge = {
    call: callSite
  };
})();
