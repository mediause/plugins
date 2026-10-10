(function () {
  function notReady(message) {
    return {
      success: false,
      error: {
        code: "bridge.script.not_ready",
        message: message,
        details: null
      }
    };
  }

  async function runSearchList(payload) {
    var sdk = window.__mediauseDytt8899E2E;
    if (!sdk || typeof sdk.searchMovie !== "function") {
      return notReady("window.__mediauseDytt8899E2E.searchMovie is not ready");
    }
    return sdk.searchMovie(payload || {});
  }

  async function runGetDetail(payload) {
    var sdk = window.__mediauseDytt8899E2E;
    if (!sdk || typeof sdk.getDetail !== "function") {
      return notReady("window.__mediauseDytt8899E2E.getDetail is not ready");
    }
    return sdk.getDetail(payload || {});
  }

  if (typeof window.__mediauseRegisterPluginBootstrap === "function") {
    window.__mediauseRegisterPluginBootstrap({
      platform: "dytt8899_e2e",
      version: "v1",
      handlers: {
        "search.list": runSearchList,
        "get.detail": runGetDetail
      }
    });
  }
})();