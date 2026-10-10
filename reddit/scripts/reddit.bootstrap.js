(function () {
  if (typeof window.__mediauseRegisterPluginBootstrap !== 'function') {
    throw new Error('mediause bridge core is not loaded');
  }

  window.__mediauseRegisterPluginBootstrap({
    platform: 'reddit',
    version: 'v1',
    handlers: {
      'account.health': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('accountHealth', payload);
      },
      'get.home': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('getHome', payload);
      },
      'get.hot': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('getHot', payload);
      },
      'get.popular': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('getPopular', payload);
      },
      'get.frontpage': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('getFrontpage', payload);
      },
      'get.subreddit': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('getSubreddit', payload);
      },
      'get.subreddit-info': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('getSubredditInfo', payload);
      },
      'search.posts': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('searchPosts', payload);
      },
      'read.item': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('readItem', payload);
      },
      'user.profile': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('userProfile', payload);
      },
      'user.posts': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('userPosts', payload);
      },
      'user.comments': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('userComments', payload);
      },
      'collection.subscribed': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('collectionSubscribed', payload);
      },
      'collection.saved': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('collectionSaved', payload);
      },
      'collection.upvoted': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('collectionUpvoted', payload);
      },
      'engage.comment': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('engageComment', payload);
      },
      'engage.reply': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('engageReply', payload);
      },
      'engage.save': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('engageSave', payload);
      },
      'engage.upvote': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('engageUpvote', payload);
      },
      'engage.subscribe': async function (payload) {
        return window.__mediauseRedditSiteBridge.call('engageSubscribe', payload);
      }
    }
  });
})();
