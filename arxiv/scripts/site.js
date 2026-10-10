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
    if (typeof window.__mediauseArxiv !== 'object' || window.__mediauseArxiv === null) {
      return errorResult('arxiv.bridge.not_ready', 'window.__mediauseArxiv is not available');
    }

    var method = window.__mediauseArxiv[methodName];
    if (typeof method !== 'function') {
      return errorResult('arxiv.bridge.handler_not_implemented', 'window.__mediauseArxiv.' + methodName + ' is not implemented');
    }

    try {
      return await method.call(window.__mediauseArxiv, payload || {});
    } catch (error) {
      return errorResult('arxiv.bridge.handler_failed', String(error));
    }
  }

  window.__mediauseArxivSiteBridge = {
    call: callSite
  };
})();
