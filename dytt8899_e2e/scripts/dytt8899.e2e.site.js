(function () {
  function toAbsUrl(raw) {
    if (!raw) return "";
    try {
      return new URL(raw, window.location.origin).toString();
    } catch (_error) {
      return String(raw || "");
    }
  }

  function text(node) {
    if (!node) return "";
    return String(node.textContent || "").replace(/\s+/g, " ").trim();
  }

  function idFromHref(href) {
    if (!href) return "";
    var match = String(href).match(/\/i\/(\d+)\.html/i);
    return match ? match[1] : "";
  }

  function parseSearchRows() {
    var links = Array.prototype.slice.call(
      document.querySelectorAll("div.co_content8 table a[href*='/i/']")
    );

    var dedupe = Object.create(null);
    var rows = [];

    links.forEach(function (a) {
      var href = a.getAttribute("href") || "";
      var id = idFromHref(href);
      var key = id || href;
      if (!key || dedupe[key]) return;

      dedupe[key] = true;
      rows.push({
        id: id,
        title: text(a),
        href: toAbsUrl(href)
      });
    });

    return rows;
  }

  function parseDetailBlock() {
    var container = document.querySelector("#Zoom") || document.querySelector("div#Zoom");
    var details = text(container);

    var magnetLinks = Array.prototype.slice.call(
      document.querySelectorAll("#Zoom a[href^='magnet:'], div#Zoom a[href^='magnet:']")
    ).map(function (a) {
      return {
        title: text(a),
        url: a.getAttribute("href") || ""
      };
    });

    var ftpLinks = Array.prototype.slice.call(
      document.querySelectorAll("#Zoom a[href^='ftp:'], div#Zoom a[href^='ftp:']")
    ).map(function (a) {
      return {
        title: text(a),
        url: a.getAttribute("href") || ""
      };
    });

    var scoreNode = document.querySelector(".position .rank, .position strong");

    return {
      details: details,
      score: text(scoreNode),
      magnet_links: magnetLinks,
      ftp_links: ftpLinks
    };
  }

  window.__mediauseDytt8899E2E = {
    searchMovie: function (payload) {
      var safe = payload || {};
      var page = Number(safe.page || 1);
      var limit = Number(safe.limit || 20);
      var allRows = parseSearchRows();
      var start = Math.max(0, (page - 1) * limit);
      var end = limit > 0 ? (start + limit) : allRows.length;
      var list = allRows.slice(start, end);

      return {
        success: true,
        data: {
          site: "dytt8899",
          keyword: String(safe.keyword || ""),
          url: window.location.href,
          total: allRows.length,
          page: page,
          limit: limit,
          list: list
        }
      };
    },

    getDetail: function (payload) {
      var safe = payload || {};
      var heading = document.querySelector("h1") || document.querySelector("title");
      var parsed = parseDetailBlock();

      return {
        success: true,
        data: {
          site: "dytt8899",
          id: String(safe.id || ""),
          title: text(heading),
          url: window.location.href,
          details: parsed.details,
          score: parsed.score,
          magnet_links: parsed.magnet_links,
          ftp_links: parsed.ftp_links
        }
      };
    }
  };
})();