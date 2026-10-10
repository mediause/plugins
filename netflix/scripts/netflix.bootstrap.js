(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    return;
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'netflix',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return window.__mediauseNetflix.checkAccountHealth();
      },
      'list.home': async function (payload) {
        return window.__mediauseNetflix.getHomeContent(payload || {});
      },
      'list.shows': async function (payload) {
        return window.__mediauseNetflix.listShows(payload || {});
      },
      'list.movies': async function (payload) {
        return window.__mediauseNetflix.listMovies(payload || {});
      },
      'list.trending': async function (payload) {
        return window.__mediauseNetflix.listTrending(payload || {});
      },
      'list.top10': async function (payload) {
        return window.__mediauseNetflix.getTop10(payload || {});
      },
      'list.recommend': async function (payload) {
        return window.__mediauseNetflix.listRecommend(payload || {});
      },
      'list.comingSoon': async function (payload) {
        return window.__mediauseNetflix.getComingSoon(payload || {});
      },
      'list.leavingSoon': async function (payload) {
        return window.__mediauseNetflix.getLeavingSoon(payload || {});
      },
      'list.kDramas': async function (payload) {
        return window.__mediauseNetflix.getKDramas(payload || {});
      },
      'list.anime': async function (payload) {
        return window.__mediauseNetflix.getAnime(payload || {});
      },
      'list.whatToWatch': async function (payload) {
        return window.__mediauseNetflix.getWhatToWatch(payload || {});
      },
      'list.podcasts': async function (payload) {
        return window.__mediauseNetflix.listPodcasts(payload || {});
      },
      'get.tudum': async function (payload) {
        return window.__mediauseNetflix.getTudumDetail(payload || {});
      },
      'get.article': async function (payload) {
        return window.__mediauseNetflix.getArticleDetail(payload || {});
      },
      'search.whatsnew': async function (payload) {
        return window.__mediauseNetflix.searchWhatsNew(payload || {});
      }
    }
  });
})();
