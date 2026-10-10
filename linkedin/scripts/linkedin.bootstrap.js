(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  async function forward(methodName, payload) {
    if (!window.__mediauseLinkedinSiteBridge || typeof window.__mediauseLinkedinSiteBridge.call !== 'function') {
      return {
        success: false,
        error: {
          code: 'linkedin.bridge.not_ready',
          message: 'window.__mediauseLinkedinSiteBridge.call is not available',
          details: null
        }
      };
    }

    return window.__mediauseLinkedinSiteBridge.call(methodName, payload || {});
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'linkedin',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) { return forward('accountHealth', payload); },
      'search.jobs': async function (payload) { return forward('searchJobs', payload); },
      'search.people': async function (payload) { return forward('searchPeople', payload); },
      'search.salesnav': async function (payload) { return forward('searchSalesnav', payload); },
      'get.timeline': async function (payload) { return forward('getTimeline', payload); },
      'get.inbox': async function (payload) { return forward('getInbox', payload); },
      'get.job-detail': async function (payload) { return forward('getJobDetail', payload); },
      'get.jobs-preferences': async function (payload) { return forward('getJobsPreferences', payload); },
      'get.sent-invitations': async function (payload) { return forward('getSentInvitations', payload); },
      'get.services-read': async function (payload) { return forward('getServicesRead', payload); },
      'get.thread-snapshot': async function (payload) { return forward('getThreadSnapshot', payload); },
      'profile.read': async function (payload) { return forward('profileRead', payload); },
      'profile.experience': async function (payload) { return forward('profileExperience', payload); },
      'profile.projects': async function (payload) { return forward('profileProjects', payload); },
      'profile.analytics': async function (payload) { return forward('profileAnalytics', payload); },
      'post.analytics': async function (payload) { return forward('postAnalytics', payload); },
      'engage.connect': async function (payload) { return forward('engageConnect', payload); },
      'message.safe-send': async function (payload) { return forward('messageSafeSend', payload); },
      'salesnav.inbox': async function (payload) { return forward('salesnavInbox', payload); },
      'salesnav.message': async function (payload) { return forward('salesnavMessage', payload); },
      'salesnav.thread': async function (payload) { return forward('salesnavThread', payload); }
    }
  });
})();
