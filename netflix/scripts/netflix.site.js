(function () {
  'use strict';

  // Main Netflix Tudum object
  const netflix = {
    /**
     * Extract article/content card from DOM
     * Returns standardized content object
     */
    extractContentCard: function (element) {
      if (!element) return null;

      try {
        const linkEl = element.querySelector('a[href*="/tudum/"]');
        const imgEl = element.querySelector('img');
        const titleEl = element.querySelector('h2, h3, a');

        if (!linkEl || !titleEl) return null;

        const href = linkEl.getAttribute('href') || '';
        const slug = href.replace(/^\/tudum\//, '').split('?')[0];
        const title = titleEl.textContent?.trim() || '';
        const imageUrl = imgEl?.getAttribute('src') || '';
        const description = element.querySelector('p')?.textContent?.trim() || '';

        return {
          id: slug || title,
          title: title,
          slug: slug,
          description: description,
          imageUrl: imageUrl,
          url: href,
          type: 'article',
          // publishedAt: new Date().toISOString()
        };
      } catch (e) {
        return null;
      }
    },

    /**
     * Get content from home page
     */
    getHomeContent: function (params) {
      try {
        const items = [];
        
        // Extract from Featured Links section
        const featuredLinks = document.querySelectorAll('nav[aria-label="Featured Links"] a[href*="/tudum/"]');
        const mainEl = document.querySelector('[role="main"]') || document.querySelector('main');
        const articleCards = mainEl?.querySelectorAll('article') || [];

        // Get featured items
        featuredLinks.forEach((link) => {
          const title = link.textContent?.trim() || '';
          const href = link.getAttribute('href') || '';
          const slug = href.replace(/^\/tudum\//, '').split('?')[0];
          
          if (title && slug) {
            items.push({
              id: slug,
              title: title,
              slug: slug,
              description: 'Featured content from Netflix Tudum',
              imageUrl: '',
              type: 'featured',
              url: href,
              // publishedAt: new Date().toISOString()
            });
          }
        });

        // Get article cards from main content
        articleCards.forEach((card) => {
          const linkEl = card.querySelector('a[href*="/tudum/"]');
          const titleEl = card.querySelector('h2, h3, a');
          const imgEl = card.querySelector('img');

          if (titleEl) {
            const href = linkEl?.getAttribute('href') || '';
            const slug = href.replace(/^\/tudum\//, '').split('?')[0];
            const title = titleEl.textContent?.trim() || '';
            const imageUrl = imgEl?.getAttribute('src') || '';
            const description = imgEl?.getAttribute('alt') || '';

            items.push({
              id: slug || title,
              title: title,
              slug: slug,
              description: description,
              imageUrl: imageUrl,
              type: 'article',
              url: href,
              // publishedAt: new Date().toISOString()
            });
          }
        });

        // Paginate
        const page = params.page || 1;
        const limit = params.limit || 20;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedItems = items.slice(start, end);

        return {
          success: true,
          data: paginatedItems,
          pagination: {
            page: page,
            limit: limit,
            total: items.length,
            hasMore: end < items.length
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to extract home content: ' + e.message,
          data: []
        };
      }
    },

    /**
     * List TV shows
     */
    listShows: function (params) {
      return netflix._listByCategory('shows', params);
    },

    /**
     * List movies
     */
    listMovies: function (params) {
      return netflix._listByCategory('movies', params);
    },

    /**
     * List trending content
     */
    listTrending: function (params) {
      return netflix._listByCategory('trending', params);
    },

    /**
     * Generic list by category
     */
    _listByCategory: function (category, params) {
      try {
        const items = [];
        const mainEl = document.querySelector('[role="main"]') || document.querySelector('main');
        const articleCards = mainEl?.querySelectorAll('article') || [];

        articleCards.forEach((card) => {
          const linkEl = card.querySelector('a[href*="/tudum/"]');
          const titleEl = card.querySelector('h2, h3, a');
          const imgEl = card.querySelector('img');

          if (titleEl) {
            const href = linkEl?.getAttribute('href') || '';
            const slug = href.replace(/^\/tudum\//, '').split('?')[0];
            const title = titleEl.textContent?.trim() || '';
            const imageUrl = imgEl?.getAttribute('src') || '';
            const description = imgEl?.getAttribute('alt') || '';

            items.push({
              id: slug || title,
              title: title,
              slug: slug,
              description: description,
              imageUrl: imageUrl,
              category: category,
              type: 'article',
              url: href,
              // publishedAt: new Date().toISOString()
            });
          }
        });

        // Paginate
        const page = params.page || 1;
        const limit = params.limit || 20;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedItems = items.slice(start, end);

        return {
          success: true,
          data: paginatedItems,
          pagination: {
            page: page,
            limit: limit,
            total: items.length,
            hasMore: end < items.length
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to extract ' + category + ' content: ' + e.message,
          data: []
        };
      }
    },

    /**
     * Get Top 10 rankings
     */
    getTop10: function (params) {
      try {
        const items = [];
        const region = params.region || 'Global';
        const type = params.type || 'movies';

        // Extract Top 10 items from table
        const mainEl = document.querySelector('[role="main"]') || document.querySelector('main');
        const table = mainEl?.querySelector('table');
        
        if (!table) {
          return {
            success: false,
            error: 'Top 10 table not found',
            data: []
          };
        }

        // Get all rows from tbody (skip header row)
        const rows = table.querySelectorAll('tbody tr');
        
        rows.forEach((row, idx) => {
          const cells = row.querySelectorAll('td');
          if (cells.length >= 5) {
            // Extract from each column
            const rankTitle = cells[0].textContent?.trim() || '';
            const weeksChange = cells[1].textContent?.trim() || '';
            const views = cells[2].textContent?.trim() || '';
            const runtime = cells[3].textContent?.trim() || '';
            const hoursViewed = cells[4].textContent?.trim() || '';

            // Separate rank number from title (e.g., "01Enola Holmes 3" -> rank: 1, title: "Enola Holmes 3")
            const rankMatch = rankTitle.match(/^(\d+)\s*(.*)/);
            const rank = rankMatch ? parseInt(rankMatch[1]) : (idx + 1);
            const title = rankMatch ? rankMatch[2].trim() : rankTitle;

            if (title) {
              const slug = title.toLowerCase().replace(/:/g, '').replace(/\s+/g, '-'); 
              items.push({
                id: rank + '-' + slug,
                rank: rank,
                title: title,
                slug: slug,
                trailer: '/tudum/videos/watch-' + slug + '-trailer',
                views: views,
                runtime: runtime,
                hoursViewed: hoursViewed,
                weeksChange: weeksChange || '',
                type: type === 'tv' ? 'show' : 'movie',
                region: region,
                url: '/tudum/' + slug,
                // publishedAt: new Date().toISOString()
              });
            }
          }
        });

        // Paginate
        const page = params.page || 1;
        const limit = params.limit || 10;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedItems = items.slice(start, end);

        return {
          success: true,
          data: paginatedItems,
          pagination: {
            page: page,
            limit: limit,
            total: items.length,
            hasMore: end < items.length
          },
          metadata: {
            region: region,
            type: type
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to extract Top 10 content: ' + e.message,
          data: []
        };
      }
    },

    /**
     * List recommended content (What to Watch)
     */
    listRecommend: function (params) {
      return netflix._listByCategory('recommend', params);
    },

    getComingSoon: function (params) {
      return netflix._getFeedItems('coming_soon', 'https://www.whats-on-netflix.com/coming-soon/feed/', params);
    },

    getLeavingSoon: function (params) {
      return netflix._getFeedItems('leaving_soon', 'https://www.whats-on-netflix.com/leaving-soon/feed/', params);
    },

    getKDramas: function (params) {
      return netflix._getFeedItems('k_dramas', 'https://www.whats-on-netflix.com/news/k-dramas/feed/', params);
    },

    getAnime: function (params) {
      return netflix._getFeedItems('anime', 'https://www.whats-on-netflix.com/news/anime/feed/', params);
    },

    getWhatToWatch: function (params) {
      return netflix._getFeedItems('what_to_watch', 'https://www.whats-on-netflix.com/what-to-watch/feed/', params);
    },

    /**
     * Sanitize XML content to fix common entity reference errors
     * Escapes unescaped ampersands that are not part of valid entity references
     */
    _sanitizeXml: function (xmlString) {
      if (!xmlString) return xmlString;
      
      // Fix: Replace & that is not followed by valid entity patterns
      // Valid patterns: &#123; &#x1a2; &nbsp; &amp; etc.
      // This regex matches & that are NOT part of valid entities
      xmlString = xmlString.replace(/&(?!(?:#\d+|#x[\da-f]+|[a-z]+);)/gi, '&amp;');
      
      return xmlString;
    },

    _getFeedItems: function (category, feedUrl, params) {
      try {
        const items = [];

        // Try to parse as XML/RSS first
        let xmlDoc = null;
        let parseError = null;
        
        try {
          const rootTag = document.documentElement.tagName.toLowerCase();
          // Check if document is already parsed as XML (when navigating to RSS feed directly)
          if (rootTag === 'rss' || rootTag === 'feed') {
            xmlDoc = document;
          } else if (rootTag.toLowerCase() === 'html') {
            // If document is HTML, look for RSS content within it or try body text
            // Check if there's an embedded RSS/XML in the body
            const bodyText = document.body?.textContent || '';
            if (bodyText.includes('<?xml') || bodyText.includes('<rss') || bodyText.includes('<feed')) {
              // Try to extract and parse XML content from HTML body
              const rssMatch = bodyText.match(/<\?xml[\s\S]*?<\/(?:rss|feed)>/i);
              if (rssMatch) {
                let xmlContent = rssMatch[0];
                xmlContent = netflix._sanitizeXml(xmlContent);
                
                const parser = new DOMParser();
                xmlDoc = parser.parseFromString(xmlContent, 'text/xml');
                
                if (xmlDoc.documentElement.tagName === 'parsererror') {
                  parseError = xmlDoc.documentElement.textContent;
                  xmlDoc = null;
                }
              }
            }
          }
        } catch (e) {
          // Silently continue if XML parsing fails
          parseError = e.message;
        }

        // Parse XML/RSS format
        if (xmlDoc && (xmlDoc.documentElement.tagName === 'rss' || xmlDoc.documentElement.tagName === 'feed')) {
          const itemNodes = xmlDoc.querySelectorAll('item, entry');
          if (!itemNodes.length) {
            const fallbackItems = xmlDoc.getElementsByTagName('item');
            for (let i = 0; i < fallbackItems.length; i += 1) {
              itemNodes[i] = fallbackItems[i];
            }
          }
          itemNodes.forEach((node) => {
            let title = node.querySelector('title')?.textContent?.trim() || '';
            title = netflix._decodeHtmlEntities(title);
            let description = node.querySelector('description, summary, content')?.textContent?.trim() || '';
            description = netflix._decodeHtmlEntities(description);
            const link = node.querySelector('link');
            const url = link?.getAttribute('href') || link?.textContent?.trim() || feedUrl;
            let pubDate = node.querySelector('pubDate, updated')?.textContent?.trim() || '';
            let imageUrl = '';
            const mediaContent = node.getElementsByTagName("media:content")[0];;
            if (mediaContent) {
              imageUrl = mediaContent.getAttribute('url') || '';
            }
            if (!imageUrl) {
              const enclosure = node.querySelector('[medium="image"]');
              if (enclosure) {
                imageUrl = enclosure.getAttribute('url') || '';
              }
            }
            if (title) {
              const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
              items.push({
                id: slug || title,
                title,
                slug,
                description,
                imageUrl,
                category,
                type: 'feed_item',
                url,
                publishedAt: pubDate || "",
              });
            }
          });
        }

        const page = params.page || 1;
        const limit = params.limit || 20;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedItems = items.slice(start, end);

        return {
          success: true,
          data: paginatedItems,
          metadata: {
            category,
            sourceUrl: feedUrl,
            itemCount: items.length,
            parseError
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to extract feed content for ' + category + ': ' + e.message,
          data: []
        };
      }
    },

    /**
     * Decode HTML entities
     */
    _decodeHtmlEntities: function (text) {
      if (!text) return '';
      const textArea = document.createElement('textarea');
      textArea.innerHTML = text;
      return textArea.value;
    },

    /**
     * List podcasts
     */
    listPodcasts: function (params) {
      try {
        const items = [];
        const mainEl = document.querySelector('[role="main"]') || document.querySelector('main');
        const podcastCards = mainEl?.querySelectorAll('article') || [];

        podcastCards.forEach((card) => {
          const linkEl = card.querySelector('a[href*="/tudum/"]');
          const titleEl = card.querySelector('h2, h3, a');
          const imgEl = card.querySelector('img');

          if (titleEl) {
            const title = titleEl.textContent?.trim() || '';
            const href = linkEl?.getAttribute('href') || '';
            const slug = href.replace(/^\/tudum\//, '').split('?')[0];
            const description = imgEl?.getAttribute('alt') || '';

            items.push({
              id: slug || title,
              title: title,
              slug: slug,
              description: description,
              imageUrl: imgEl?.getAttribute('src') || '',
              type: 'podcast',
              url: href,
              // publishedAt: new Date().toISOString()
            });
          }
        });

        // Paginate
        const page = params.page || 1;
        const limit = params.limit || 20;
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedItems = items.slice(start, end);

        return {
          success: true,
          data: paginatedItems,
          pagination: {
            page: page,
            limit: limit,
            total: items.length,
            hasMore: end < items.length
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to extract podcast content: ' + e.message,
          data: []
        };
      }
    },

    /**
     * Get title hub detail - dynamically extract sections based on sticky navigation
     * Each page may have different sections (Featured, Latest, Videos, Episodes, Shop, etc.)
     */
    getTudumDetail: function (params) {
      try {
        const slug = params.slug || '';
        if (!slug) {
          return {
            success: false,
            error: 'Title slug is required',
            data: null
          };
        }

        const mainEl = document.querySelector('[role="main"]') || document.querySelector('main');
        if (!mainEl) {
          return {
            success: false,
            error: 'Unable to find main content area',
            data: null
          };
        }

        // Extract hero image and metadata from header section
        const heroSection = mainEl.querySelector('div[style*="background"] img') || mainEl.querySelector('img[alt*="Key art"]');
        const heroImageUrl = heroSection?.getAttribute('src') || '';

        // Extract title
        const titleEl = mainEl.querySelector('h1');
        const title = titleEl?.textContent?.trim() || '';

        // Extract metadata (year, rating, seasons)
        const metadataEls = mainEl.querySelectorAll('div:has(> *:only-child) > *');
        let year = '', rating = '', seasons = '';
        let foundCount = 0;
        for (let el of metadataEls) {
          const text = el.textContent?.trim();
          if (text && foundCount < 3) {
            if (/^\d{4}$/.test(text)) year = text;
            else if (/^TV-|^PG|^R|^NC-17|^G/.test(text)) rating = text;
            else if (/^[0-9]+ Seasons?$/.test(text)) seasons = text;
            if (text) foundCount++;
          }
        }

        // Extract description from synopsis
        const synopsisEl = mainEl.querySelector('[data-uia="synopsis"]');
        const description = synopsisEl?.textContent?.trim() || '';

        // Extract watch button
        const watchButton = mainEl.querySelector('a[href*="/watch/"], a[href*="netflix.com/watch"]');
        const watchUrl = watchButton?.getAttribute('href') || '';

        // Dynamically extract sections based on sticky navigation
        const stickyNav = document.querySelector('[data-uia="section-sticky-text-nav"]');
        const sections = {};
        
        if (stickyNav) {
          // Get all navigation links to determine which sections exist
          const navLinks = stickyNav.querySelectorAll('a');
          
          for (let navLink of navLinks) {
            const text = navLink.textContent?.trim();
            const href = navLink.getAttribute('href');
            if (!text || !href || !href.startsWith('#')) continue;
            
            const sectionId = href.substring(1).toLowerCase(); // Remove # and lowercase
            const sectionEl = document.getElementById(sectionId);
            
            if (!sectionEl) continue;
            
            // Special handling for Episodes section
            if (sectionId === 'episodes') {
              const articles = sectionEl.querySelectorAll('article');
              const episodes = [];
              
              for (let i = 0; i < Math.min(articles.length, 20); i++) {
                const article = articles[i];
                
                // Extract title from display-headline div
                const headlineEl = article.querySelector('[data-uia="display-headline"]');
                const titleEl = headlineEl?.querySelector('div:first-child');
                const episodeTitle = titleEl?.textContent?.trim() || '';
                
                // Extract description from sub-headline div
                const subHeadlineEl = article.querySelector('[data-uia="sub-headline"]');
                const episodeDesc = subHeadlineEl?.textContent?.trim().substring(0, 150) || '';
                
                if (episodeTitle) {
                  episodes.push({
                    number: i + 1,
                    title: episodeTitle,
                    description: episodeDesc
                  });
                }
              }
              
              // Format episodes as "Episode 1: Aang / Episode 2: Warriors / ..."
              sections[text] = {
                count: episodes.length,
                items: episodes
              };
            } else {
              // Standard handling for other sections
              const articles = sectionEl.querySelectorAll('article');
              const items = [];
              
              for (let i = 0; i < Math.min(articles.length, 10); i++) {
                const article = articles[i];
                const linkEl = article.querySelector('a[href*="/tudum/"]');
                const titleTextEl = article.querySelector('generic');
                const imgEl = article.querySelector('img');
                
                if (linkEl) {
                  const href = linkEl.getAttribute('href');
                  const altText = imgEl?.getAttribute('alt') || '';
                  
                  // Determine if it's a video or article based on alt text and href
                  let itemType = 'article';
                  if (altText.includes('Video') || href?.includes('/videos/')) {
                    itemType = 'video';
                  }
                  
                  items.push({
                    title: titleTextEl?.textContent?.trim() || linkEl.textContent?.trim() || '',
                    url: href,
                    slug: href?.split('/tudum/').pop()?.split('?')[0] || '',
                    type: itemType,
                    imageUrl: imgEl?.getAttribute('src') || ''
                  });
                }
              }
              
              if (items.length > 0) {
                sections[text] = {
                  count: articles.length,
                  items: items
                };
              }
            }
          }
        }

        // Extract trailer link from hero button
        let trailerUrl = '';
        const trailerBtn = mainEl.querySelector('[data-uia="title-hero-trailer"]');
        if (trailerBtn) {
          trailerUrl = trailerBtn.getAttribute('href') || '';
        }

        return {
          success: true,
          data: {
            id: slug,
            title: title,
            slug: slug,
            description: description,
            heroImageUrl: heroImageUrl,
            type: 'title_hub',
            url: '/tudum/' + slug,
            watchUrl: watchUrl,
            trailerUrl: trailerUrl,
            sections: sections
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to extract tudum detail: ' + e.message,
          data: null
        };
      }
    },

    getArticleDetail: function (params) {
      try {
        const slug = params.slug || '';
        if (!slug) {
          return {
            success: false,
            error: 'Article slug is required',
            data: null
          };
        }

        const mainEl = document.querySelector('[role="main"]') || document.querySelector('main');
        if (!mainEl) {
          return {
            success: false,
            error: 'Unable to find main content area',
            data: null
          };
        }

        // Extract article metadata from article element
        const articleEl = mainEl.querySelector('article');
        let title = '';
        let category = 'Article';
        let author = '';
        let authorSlug = '';
        let dateText = '';

        if (articleEl) {
          // Extract category (first child generic text, e.g., "News")
          const categoryGeneric = articleEl.querySelector(':scope > generic:first-child');
          if (categoryGeneric) {
            const catText = categoryGeneric.textContent?.trim();
            if (catText && catText.length < 20) {
              category = catText;
            }
          }

          // Extract title from h1 inside article
          const titleEl = articleEl.querySelector('h1');
          if (titleEl) {
            title = titleEl.textContent?.trim() || '';
          }

          // Extract author and date from article metadata
          const authorLink = articleEl.querySelector('a[href*="/tudum/authors/"]');
          if (authorLink) {
            author = authorLink.textContent?.trim()?.replace('By ', '') || '';
            authorSlug = authorLink.getAttribute('href')?.split('/authors/').pop() || '';
            
            // Date is in the next sibling generic after the author's parent
            const dateGeneric = authorLink.closest('generic')?.nextElementSibling;
            if (dateGeneric) {
              dateText = dateGeneric.textContent?.trim() || '';
            }
          }
        }

        // Extract main content from article-content section
        const articleContent = mainEl.querySelector('[data-uia="article-content"]');
        const bodyParts = [];
        
        if (articleContent) {
          // Collect paragraphs, headings, and list items from article-content area
          const contentElements = articleContent.querySelectorAll('paragraph, p, h3, h4, li');
          for (let elem of contentElements) {
            const text = elem.textContent?.trim();
            // Filter out navigation, short texts, and specific patterns
            if (text && text.length > 20 && 
                !text.match(/^(By|June|May|April|March|February|January|As you|Scroll down|Skip|Sign In|Home|Top 10)/i) &&
                !text.includes('URL:') &&
                !text.includes('facebook.com') &&
                !text.includes('twitter.com')) {
              bodyParts.push(text);
            }
          }
        }

        const bodyText = bodyParts.slice(0, 30).join('\n\n'); // Limit to 30 sections

        // Extract images - from article-content area only
        const imageUrls = [];
        const seenUrls = new Set();
        
        if (articleContent) {
          const contentImages = articleContent.querySelectorAll('img');
          
          for (let img of contentImages) {
            const src = img.getAttribute('src');
            const alt = img.getAttribute('alt') || '';
            
            // Skip if already added, or if it's an error/nav image
            if (src && src.startsWith('http') && 
                !seenUrls.has(src) &&
                !alt.match(/Pardon|Error|Sign In|Netflix|Share|External|Video/i)) {
              
              // Get caption if available
              let caption = '';
              const parent = img.parentElement;
              if (parent) {
                const figcaption = parent.querySelector('figcaption');
                const captionDiv = parent.querySelector('[class*="caption"]');
                const captionGeneric = Array.from(parent.querySelectorAll('generic')).find(g => 
                  g.textContent?.match(/PHOTO|CREDIT|By/i)
                );
                caption = figcaption?.textContent?.trim() || 
                         captionDiv?.textContent?.trim() ||
                         captionGeneric?.textContent?.trim() || '';
              }
              
              imageUrls.push({
                url: src,
                alt: alt.substring(0, 200), // Limit alt text length
                title: caption.substring(0, 100)
              });
              seenUrls.add(src);
            }
          }
        }

        // Extract tags/related topics
        const tagLinks = mainEl.querySelectorAll('a[href*="/tudum/topics/"]');
        const tags = [];
        for (let link of tagLinks) {
          const text = link.textContent?.trim();
          if (text && text.length > 0 && text.length < 50) {
            tags.push(text);
          }
        }

        return {
          success: true,
          data: {
            id: slug,
            title: title,
            slug: slug,
            type: 'article',
            url: '/tudum/articles/' + slug,
            category: category,
            author: author,
            authorSlug: authorSlug,
            publishedAt: dateText,
            content: bodyText,
            images: imageUrls,
            tags: tags,
            metadata: {
              wordCount: bodyText.split(/\s+/).length,
              imageCount: imageUrls.length,
              tagCount: tags.length
            }
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to extract article detail: ' + e.message,
          data: null
        };
      }
    },

    /**
     * Check account health
     * Netflix Tudum is publicly accessible, so we check if the page loads
     */
    checkAccountHealth: function () {
      try {
        const mainEl = document.querySelector('[role="main"]') || document.querySelector('main');
        const pageLoaded = document.body && (mainEl || document.querySelector('[role="region"]'));
        const isAccessible = !!document.querySelector('nav[aria-label="Main Menu"]');

        return {
          success: true,
          data: {
            healthy: isAccessible && pageLoaded,
            account: {
              id: 'guest_tudum',
              nick: 'Netflix Tudum',
              login: true
            }
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to check account health: ' + e.message,
          data: {
            healthy: false,
            account: {
              id: null,
              nick: null,
              login: false
            }
          }
        };
      }
    },

    /**
     * Search and filter What's New on Netflix
     * Sets filter values including search input and extracts filtered content from whats-on-netflix.com/whats-new/
     */
    searchWhatsNew: function (params) {
      try {
        const search = (params.search || '').toLowerCase().trim();
        const type = (params.type || '').toLowerCase();
        const genre = (params.genre || '').toLowerCase();
        const language = (params.language || '').toLowerCase();
        const archive = (params.archive || '').toLowerCase();
        const page = Math.max(1, params.page || 1);
        const limit = Math.min(100, Math.max(1, params.limit || 20));

        // Apply search input first
        const searchInput = document.getElementById('wn-search');
        if (searchInput && search && search !== '') {
          searchInput.value = search;
          searchInput.dispatchEvent(new Event('input', { bubbles: true }));
          searchInput.dispatchEvent(new Event('change', { bubbles: true }));
        }

        // Apply filters to page select elements
        const typeSelect = document.getElementById('wn-type');
        const genreSelect = document.getElementById('wn-genre');
        const languageSelect = document.getElementById('wn-language');

        if (typeSelect && type && type !== '') {
          typeSelect.value = type;
          typeSelect.dispatchEvent(new Event('change', { bubbles: true }));
          typeSelect.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (genreSelect && genre && genre !== '') {
          genreSelect.value = genre;
          genreSelect.dispatchEvent(new Event('change', { bubbles: true }));
          genreSelect.dispatchEvent(new Event('input', { bubbles: true }));
        }

        if (languageSelect && language && language !== '') {
          languageSelect.value = language;
          languageSelect.dispatchEvent(new Event('change', { bubbles: true }));
          languageSelect.dispatchEvent(new Event('input', { bubbles: true }));
        }

        // Extract all visible content cards from the page
        // The page automatically filters based on select values and search input
        const allCards = document.querySelectorAll('.wn-title-card');
        const items = [];

        allCards.forEach(card => {
          try {
            const titleEl = card.querySelector('.wn-title-name');
            const linkEl = card.querySelector('a');
            const posterEl = card.querySelector('.wn-title-poster');
            const descEl = card.querySelector('.wn-title-desc-short');
            const allText = card.textContent || '';

            if (!titleEl || !linkEl) return;

            const title = titleEl.textContent?.trim();
            const href = linkEl.getAttribute('href') || '';
            const poster = posterEl?.getAttribute('src') || '';
            const description = descEl?.textContent?.trim() || '';

            // Infer content type from text
            let contentType = 'movie';
            if (allText.includes('TV Series') || allText.includes('Season') || allText.includes('Episodes Weekly')) {
              contentType = 'series';
            }

            // Extract genres from text
            const genreKeywords = ['drama', 'action', 'comedy', 'thriller', 'horror', 'romance', 'sci-fi', 
                                  'adventure', 'animation', 'documentary', 'family', 'fantasy', 'mystery', 
                                  'crime', 'war', 'western', 'musical', 'sports', 'reality', 'talk show', 
                                  'podcast', 'biography', 'history'];
            const contentGenres = [];
            genreKeywords.forEach(g => {
              if (allText.toLowerCase().includes(g)) {
                contentGenres.push(g);
              }
            });

            // Extract language from text (look for common language indicators)
            let detectedLanguage = '';
            const languageIndicators = {
              'english': ['English'],
              'french': ['French'],
              'spanish': ['Spanish'],
              'portuguese': ['Portuguese'],
              'german': ['German'],
              'italian': ['Italian'],
              'korean': ['Korean'],
              'japanese': ['Japanese'],
              'chinese': ['Chinese'],
              'mandarin': ['Mandarin'],
              'hindi': ['Hindi'],
              'arabic': ['Arabic'],
              'dutch': ['Dutch'],
              'russian': ['Russian'],
              'turkish': ['Turkish'],
              'polish': ['Polish'],
              'thai': ['Thai'],
              'vietnamese': ['Vietnamese']
            };

            Object.entries(languageIndicators).forEach(([lang, indicators]) => {
              indicators.forEach(ind => {
                if (allText.includes(ind)) {
                  detectedLanguage = lang;
                }
              });
            });

            // Extract year from title (e.g., "Nightcrawler (2014)" -> 2014)
            let publishedAt = null;
            const yearMatch = title.match(/\((\d+)\)/);
            if (yearMatch) {
              const year = yearMatch[1];
              // Create date for January 1st of that year
              publishedAt = year;
            }

            // Extract metadata information
            const meta = {};

            // Extract rating (e.g., PG-13)
            const metaSpans = card.querySelectorAll('.wn-title-meta span');
            if (metaSpans.length > 0) {
              meta.rating = metaSpans[0]?.textContent?.trim() || '';
              meta.duration = metaSpans[1]?.textContent?.trim() || '';
              meta.language = metaSpans[2]?.textContent?.trim() || detectedLanguage || 'unknown';
            }

            // Extract ratings (IMDb, RT, Metacritic, Letterboxd)
            const ratings = {};
            const ratingElements = card.querySelectorAll('.wn-poster-rating');
            ratingElements.forEach((el) => {
              const title = el.getAttribute('title');
              const value = el.querySelector('span:last-child')?.textContent?.trim();
              if (title && value) {
                ratings[title] = value;
              }
            });
            if (Object.keys(ratings).length > 0) {
              meta.ratings = ratings;
            }

            // Extract director, writer, country, cast
            const extras = card.querySelectorAll('.wn-title-extra');
            extras.forEach((el) => {
              const label = el.querySelector('.wn-extra-label')?.textContent?.trim().toLowerCase().replace(':', '');
              const value = el.textContent?.replace(el.querySelector('.wn-extra-label')?.textContent || '', '').trim();
              if (label && value) {
                if (label === 'director') meta.director = value;
                else if (label === 'writer') meta.writer = value;
                else if (label === 'country of origin') meta.country = value;
                else if (label === 'cast') meta.cast = value;
              }
            });

            // Extract awards information
            const awardsEl = card.querySelector('.wn-title-awards');
            if (awardsEl) {
              const awardsText = awardsEl.querySelector('span:last-child')?.textContent?.trim();
              if (awardsText) {
                meta.awards = awardsText;
              }
            }

            // // Extract last seen information
            // const lastSeenEl = card.querySelector('.wn-lastseen-time');
            // if (lastSeenEl) {
            //   meta.lastSeen = lastSeenEl.textContent?.trim();
            // }

            // Extract trailer ID
            const trailerBtn = card.querySelector('.wn-btn-trailer');
            if (trailerBtn) {
              const youtubeId = trailerBtn.getAttribute('data-youtube-id');
              if (youtubeId) {
                meta.trailerYoutubeId = youtubeId;
              }
            }

            items.push({
              id: href || title,
              title: title,
              type: contentType,
              genres: contentGenres,
              language: detectedLanguage || 'unknown',
              poster: poster,
              url: href,
              description: description,
              publishedAt: publishedAt,
              meta: meta
            });
          } catch (e) {
            // Skip items that fail to parse
          }
        });

        // Deduplicate by id
        const uniqueItems = [];
        const seenIds = new Set();
        items.forEach(item => {
          if (!seenIds.has(item.id)) {
            seenIds.add(item.id);
            uniqueItems.push(item);
          }
        });

        // Apply pagination
        const start = (page - 1) * limit;
        const end = start + limit;
        const paginatedItems = uniqueItems.slice(start, end);

        return {
          success: true,
          data: paginatedItems,
          pagination: {
            page: page,
            limit: limit,
            total: uniqueItems.length,
            hasMore: end < uniqueItems.length
          },
          appliedFilters: {
            search: search || 'none',
            type: type || 'all',
            genre: genre || 'all',
            language: language || 'all',
            archive: archive || 'all-time'
          }
        };
      } catch (e) {
        return {
          success: false,
          error: 'Failed to search What\'s New: ' + e.message,
          data: [],
          pagination: {
            page: 1,
            limit: 20,
            total: 0,
            hasMore: false
          }
        };
      }
    }
  };

  // Register the global object
  window.__mediauseNetflix = netflix;
})();
