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
    if (typeof window.__mediauseHackernews !== 'object' || window.__mediauseHackernews === null) {
      return errorResult('hackernews.bridge.not_ready', 'window.__mediauseHackernews is not available');
    }

    var method = window.__mediauseHackernews[methodName];
    if (typeof method !== 'function') {
      return errorResult('hackernews.bridge.handler_not_implemented', 'window.__mediauseHackernews.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseHackernews, payload || {});
    } catch (error) {
      return errorResult('hackernews.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseHackernewsSiteBridge = {
    call: callSite
  };
})();
