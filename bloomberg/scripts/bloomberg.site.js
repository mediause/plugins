(function () {
  var helpers = window.__mediauseBloombergHelpers || {};

  function errorResult(code, message, details) {
    if (typeof helpers.errorResult === 'function') {
      return helpers.errorResult(code, message, details);
    }

    return {
      success: false,
      error: {
        code: code,
        message: message,
        details: details || null
      }
    };
  }

  function successItems(items) {
    if (typeof helpers.successItems === 'function') {
      return helpers.successItems(items);
    }

    return {
      success: true,
      data: {
        items: Array.isArray(items) ? items : []
      }
    };
  }

  function accountHealth() {
    return helpers.successAccount({
      healthy: true,
      account: {
        id: 'guest',
        nick: 'guest',
        login: false
      }
    });
  }

  async function getFeedByName(feedName, payload) {
    try {
      var limit = helpers.normalizeLimit(payload && payload.limit, 1, 20);
      var items = [];
      if (typeof helpers.parseCurrentDocumentRss === 'function') {
        items = helpers.parseCurrentDocumentRss();
      }
      if (!Array.isArray(items) || !items.length) {
        items = await helpers.fetchBloombergFeed(feedName, limit);
      }
      items = items.slice(0, limit);
      if (!items.length) {
        return errorResult('bloomberg.get.empty', 'Bloomberg RSS feed returned no items');
      }
      return successItems(items);
    } catch (error) {
      return errorResult('bloomberg.get.failed', 'get ' + String(feedName) + ' failed', String(error));
    }
  }

  function listFeeds() {
    try {
      var map = helpers.BLOOMBERG_FEEDS || {};
      var rows = Object.keys(map).map(function (key) {
        return {
          name: key,
          url: map[key]
        };
      });
      return successItems(rows);
    } catch (error) {
      return errorResult('bloomberg.feeds.list_failed', 'list feeds failed', String(error));
    }
  }

  function parseStoryFromPage() {
    var raw = document.querySelector('#__NEXT_DATA__');
    if (!raw || !raw.textContent) {
      return {
        errorCode: 'NO_NEXT_DATA',
        title: document.title,
        preview: String(document.body && document.body.innerText || '').slice(0, 400)
      };
    }

    var parsed = null;
    try {
      parsed = JSON.parse(raw.textContent);
    } catch (error) {
      return {
        errorCode: 'BAD_NEXT_DATA',
        title: document.title,
        preview: String(document.body && document.body.innerText || '').slice(0, 400),
        message: String(error)
      };
    }

    var story = parsed && parsed.props && parsed.props.pageProps && parsed.props.pageProps.story;
    if (!story) {
      return {
        errorCode: 'NO_STORY',
        title: document.title,
        preview: String(document.body && document.body.innerText || '').slice(0, 400)
      };
    }

    return {
      story: {
        headline: story.headline || story.seoHeadline || story.seoTitle || (document.querySelector('h1') && document.querySelector('h1').textContent || '').trim() || document.title,
        summary: story.summary || story.socialDescription || story.seoDescription || (document.querySelector('meta[name="description"]') && document.querySelector('meta[name="description"]').getAttribute('content')) || '',
        url: story.url || story.readingUrl || location.href,
        body: story.body || null,
        lede: story.lede || null,
        ledeImageUrl: story.ledeImageUrl || null,
        socialImageUrl: story.socialImageUrl || null,
        imageAttachments: story.imageAttachments || {},
        videoAttachments: story.videoAttachments || {}
      }
    };
  }

  async function readNews(payload) {
    try {
      var isRobot = /Are you a robot/i.test(document.title)
        || /unusual activity/i.test(String(document.body && document.body.innerText || ''))
        || /click the box below to let us know you're not a robot/i.test(String(document.body && document.body.innerText || ''));

      if (isRobot) {
        return errorResult(
          'bloomberg.read.robot_page',
          'Bloomberg served the bot-protection page instead of article content',
          'Try again later with an authenticated browser session.'
        );
      }

      if (payload && payload.link) {
        helpers.validateBloombergLink(payload.link);
      }

      var result = parseStoryFromPage();
      if (result && result.errorCode) {
        return errorResult(
          'bloomberg.read.parse_failed',
          'Bloomberg page did not expose article story data (' + result.errorCode + ')',
          result.preview || null
        );
      }

      var story = result && result.story;
      if (!story) {
        return errorResult('bloomberg.read.missing_story', 'Failed to extract Bloomberg story data');
      }

      var content = helpers.renderStoryBody(story.body || {});
      if (!content) {
        return errorResult('bloomberg.read.empty_content', 'Bloomberg article body was empty after parsing');
      }

      return successItems([{
        title: story.headline || '',
        summary: story.summary || '',
        link: story.url || location.href,
        mediaLinks: helpers.extractStoryMediaLinks(story),
        content: content
      }]);
    } catch (error) {
      return errorResult('bloomberg.read.failed', 'read news failed', String(error));
    }
  }

  window.__mediauseBloomberg = {
    accountHealth: accountHealth,
    listFeeds: listFeeds,
    getMain: function (payload) {
      return getFeedByName('main', payload);
    },
    getMarkets: function (payload) {
      return getFeedByName('markets', payload);
    },
    getEconomics: function (payload) {
      return getFeedByName('economics', payload);
    },
    getIndustries: function (payload) {
      return getFeedByName('industries', payload);
    },
    getTech: function (payload) {
      return getFeedByName('tech', payload);
    },
    getPolitics: function (payload) {
      return getFeedByName('politics', payload);
    },
    getBusinessweek: function (payload) {
      return getFeedByName('businessweek', payload);
    },
    getOpinions: function (payload) {
      return getFeedByName('opinions', payload);
    },
    readNews: readNews
  };
})();
