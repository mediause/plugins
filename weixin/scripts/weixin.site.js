(function () {
  var helpers = window.__mediauseWeixinHelpers;

  function ok(data) {
    return helpers.ok(data);
  }

  function fail(code, message, details) {
    return helpers.fail(code, message, details);
  }

  function text(value) {
    return helpers.normalizeText(value);
  }

  function pickText(selectors) {
    for (var i = 0; i < selectors.length; i += 1) {
      var node = document.querySelector(selectors[i]);
      var current = text(node && node.textContent);
      if (current) {
        return current;
      }
    }
    return '';
  }

  function setInputValue(selector, value) {
    var el = document.querySelector(selector);
    if (!el) {
      return false;
    }

    var proto = el.tagName === 'TEXTAREA'
      ? window.HTMLTextAreaElement.prototype
      : window.HTMLInputElement.prototype;
    var descriptor = Object.getOwnPropertyDescriptor(proto, 'value');

    el.focus();
    if (descriptor && typeof descriptor.set === 'function') {
      descriptor.set.call(el, value);
    } else {
      el.value = value;
    }

    el.dispatchEvent(new InputEvent('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    el.blur();
    return true;
  }

  function setEditorText(value) {
    var editors = document.querySelectorAll('div[contenteditable="true"]');
    var editor = editors.length > 0 ? editors[editors.length - 1] : null;
    if (!editor) {
      return false;
    }

    editor.focus();
    editor.innerHTML = '';
    if (typeof document.execCommand === 'function') {
      document.execCommand('insertText', false, value);
    } else {
      editor.textContent = value;
    }
    editor.dispatchEvent(new InputEvent('input', { bubbles: true }));
    return true;
  }

  function clickByText(targetText) {
    var nodes = document.querySelectorAll('span, button, a');
    for (var i = 0; i < nodes.length; i += 1) {
      if (text(nodes[i].textContent) === targetText) {
        nodes[i].click();
        return true;
      }
    }
    return false;
  }

  window.__mediauseWeixin = {
    accountHealth: async function () {
      try {
        var token = helpers.readTokenFromUrl();
        var login = Boolean(token || /wxuin=/.test(document.cookie || ''));
        var idMatch = String(document.cookie || '').match(/wxuin=([^;]+)/);
        var nick = pickText([
          '.weui-desktop-account__name',
          '#js_account_name',
          '.account_name'
        ]);

        return ok({
          healthy: login,
          account: {
            id: idMatch ? idMatch[1] : null,
            nick: nick || null,
            login: login
          }
        });
      } catch (error) {
        return fail('weixin.account.health_failed', 'account health failed', String(error));
      }
    },

    searchArticles: async function (payload) {
      try {
        var safe = payload || {};
        var pageNo = helpers.toPositiveInt(safe.page, 1);
        var limit = helpers.toPositiveInt(safe.limit, 10, 10);

        var bodyText = text(document.body && document.body.innerText);
        if (/验证码|安全验证|异常访问|访问过于频繁|请输入验证码/.test(bodyText)) {
          return fail('weixin.search.blocked', 'Sogou Weixin blocked this request', bodyText.slice(0, 200));
        }

        var cards = Array.from(document.querySelectorAll('.news-list li'));
        var rows = cards.map(function (item) {
          var linkEl = item.querySelector('h3 a[href]');
          var summaryEl = item.querySelector('p.txt-info');
          var timeEl = item.querySelector('.s-p .s2');
          return {
            title: text(linkEl && linkEl.textContent),
            url: helpers.absoluteUrl(linkEl && linkEl.getAttribute('href')),
            summary: text(summaryEl && summaryEl.textContent),
            publish_time: text(timeEl && timeEl.textContent)
          };
        }).filter(function (row) {
          return row.title && row.url;
        });

        return ok({
          query: String(safe.query || ''),
          page: pageNo,
          limit: limit,
          total: rows.length,
          list: rows.slice(0, limit)
        });
      } catch (error) {
        return fail('weixin.search.articles_failed', 'search articles failed', String(error));
      }
    },

    getDrafts: async function (payload) {
      try {
        var safe = payload || {};
        var limit = helpers.toPositiveInt(safe.limit, 10, 50);

        var results = [];
        var cards = document.querySelectorAll('.weui-desktop-card');
        for (var i = 0; i < cards.length; i += 1) {
          if ((cards[i].className || '').indexOf('card_new') >= 0) {
            continue;
          }
          var titleEl = cards[i].querySelector('[class*=title]');
          var timeEl = cards[i].querySelector('[class*=tips]');
          var title = text(titleEl && titleEl.textContent);
          var time = text(timeEl && timeEl.textContent);
          if (title) {
            results.push({
              index: results.length + 1,
              title: title,
              time: time
            });
          }
        }

        if (results.length === 0) {
          var rows = document.querySelectorAll('tr, [class*=appmsg_item], [class*=list_item]');
          rows.forEach(function (row) {
            var titleEl = row.querySelector('[class*=title] a, [class*=title], h4');
            var timeEl = row.querySelector('[class*=time], td:nth-child(2)');
            var title = text(titleEl && titleEl.textContent);
            var time = text(timeEl && timeEl.textContent);
            if (title && title !== '内容') {
              results.push({
                index: results.length + 1,
                title: title,
                time: time
              });
            }
          });
        }

        return ok({
          total: results.length,
          list: results.slice(0, limit)
        });
      } catch (error) {
        return fail('weixin.get.drafts_failed', 'get drafts failed', String(error));
      }
    },

    getArticle: async function (payload) {
      try {
        var safe = payload || {};
        var contentEl = document.querySelector('#js_content');
        var title = pickText(['#activity-name', '#js_msg_title', '.rich_media_title']);
        var author = pickText(['#js_name', '.rich_media_meta.rich_media_meta_nickname', '.wx_follow_nickname']);
        var publishTime = pickText(['#publish_time']);

        var imageUrls = [];
        if (contentEl) {
          contentEl.querySelectorAll('img').forEach(function (img) {
            var src = img.getAttribute('data-src') || img.getAttribute('src') || '';
            var abs = helpers.absoluteUrl(src);
            if (abs) {
              imageUrls.push(abs);
            }
          });
        }

        var markdown = contentEl
          ? text(contentEl.innerText).split('\n').map(function (line) { return line.trim(); }).filter(Boolean).join('\n\n')
          : '';

        return ok({
          url: String(safe.url || window.location.href || ''),
          title: title,
          author: author,
          publish_time: publishTime,
          markdown: markdown,
          images: imageUrls
        });
      } catch (error) {
        return fail('weixin.get.article_failed', 'get article failed', String(error));
      }
    },

    createDraft: async function (payload) {
      try {
        var safe = payload || {};
        var title = String(safe.title || '').trim();
        var content = String(safe.content || '').trim();

        if (!title) {
          return fail('weixin.invalid_argument', 'title is required');
        }
        if (!content) {
          return fail('weixin.invalid_argument', 'content is required');
        }

        var hasTitleInput = Boolean(document.querySelector('textarea#title'));
        if (!hasTitleInput) {
          return fail('weixin.editor.not_ready', 'article editor is not loaded');
        }

        if (!setInputValue('textarea#title', title)) {
          return fail('weixin.post.fill_title_failed', 'failed to fill title');
        }

        if (safe.author) {
          setInputValue('input#author', String(safe.author));
        }

        if (!setEditorText(content)) {
          return fail('weixin.post.fill_content_failed', 'failed to fill content');
        }

        if (safe.summary) {
          setInputValue('textarea#js_description', String(safe.summary));
        }

        var saveClicked = clickByText('保存为草稿');

        return ok({
          saved: saveClicked,
          title: title,
          cover_image_requested: Boolean(safe.cover_image),
          cover_image_applied: false,
          note: safe.cover_image ? 'cover image upload is not implemented in this workflow yet' : null
        });
      } catch (error) {
        return fail('weixin.post.create_draft_failed', 'create draft failed', String(error));
      }
    }
  };
})();
