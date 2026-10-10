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
    if (typeof window.__mediauseFifa2026 !== 'object' || window.__mediauseFifa2026 === null) {
      return errorResult('fifa2026.bridge.not_ready', 'window.__mediauseFifa2026 is not available');
    }

    var method = window.__mediauseFifa2026[methodName];
    if (typeof method !== 'function') {
      return errorResult('fifa2026.bridge.handler_not_implemented', 'window.__mediauseFifa2026.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseFifa2026, payload || {});
    } catch (error) {
      return errorResult('fifa2026.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseFifa2026SiteBridge = {
    call: callSite
  };
})();
