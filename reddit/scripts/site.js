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
    if (typeof window.__mediauseReddit !== 'object' || window.__mediauseReddit === null) {
      return errorResult('reddit.bridge.not_ready', 'window.__mediauseReddit is not available');
    }

    var method = window.__mediauseReddit[methodName];
    if (typeof method !== 'function') {
      return errorResult('reddit.bridge.handler_not_implemented', 'window.__mediauseReddit.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseReddit, payload || {});
    } catch (error) {
      return errorResult('reddit.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseRedditSiteBridge = {
    call: callSite
  };
})();
