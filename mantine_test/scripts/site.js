(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap === "function") {
    window.__mediauseRegisterPluginBootstrap({
      platform: "mantine_test",
      version: "v1",
      handlers: {
        "test.run": async function () {
          var h1 = document.querySelector("h1");
          return {
            success: true,
            data: {
              status: "ok",
              final_page: h1 ? h1.innerText.trim() : "unknown",
              url: location.href
            }
          };
        }
      }
    });
  }
})();
