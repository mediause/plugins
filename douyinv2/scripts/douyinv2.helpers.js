(function () {
  var encoder = new TextEncoder();
  var AID_CREATOR = '1128';
  var AID_PUBLIC = '6383';
  var CREATOR_BASE = 'https://creator.douyin.com';
  var DRAFT_UPLOAD_URL = CREATOR_BASE + '/creator-micro/content/upload';
  var VISIBILITY_MAP = {
    public: 0,
    friends: 1,
    private: 2
  };
  var VISIBILITY_LABELS = {
    public: '公开',
    friends: '好友可见',
    private: '仅自己可见'
  };

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

  function ok(data) {
    return {
      success: true,
      data: data == null ? {} : data
    };
  }

  function okItems(items, extra) {
    var data = Object.assign({
      items: Array.isArray(items) ? items : []
    }, extra || {});
    return ok(data);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      setTimeout(resolve, ms);
    });
  }

  function compactText(value) {
    return String(value || '').replace(/\s+/g, ' ').trim();
  }

  function sanitizeLimit(value, fallback, max) {
    var n = Number(value);
    if (!Number.isFinite(n) || n <= 0) {
      n = fallback;
    }
    n = Math.floor(n);
    if (Number.isFinite(max) && max > 0 && n > max) {
      n = max;
    }
    return n;
  }

  function isTruthy(value) {
    if (typeof value === 'boolean') {
      return value;
    }
    var text = String(value || '').trim().toLowerCase();
    return text === 'true' || text === '1' || text === 'yes' || text === 'y';
  }

  function formatZhTime(timestampSeconds) {
    var n = Number(timestampSeconds);
    if (!Number.isFinite(n) || n <= 0) {
      return '';
    }
    return new Date(n * 1000).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' });
  }

  function toUnixSeconds(input) {
    if (typeof input === 'number') {
      return input;
    }
    var text = String(input || '').trim();
    if (/^\d+$/.test(text)) {
      return Number(text);
    }
    var ms = new Date(text).getTime();
    if (!Number.isFinite(ms)) {
      throw new Error('invalid time format: ' + text);
    }
    return Math.floor(ms / 1000);
  }

  function validateTiming(unixSeconds) {
    if (!Number.isFinite(unixSeconds)) {
      throw new Error('invalid unix seconds: ' + unixSeconds);
    }
    var now = Math.floor(Date.now() / 1000);
    if (unixSeconds < now + 7200) {
      throw new Error('publish time must be at least 2 hours later');
    }
    if (unixSeconds > now + 14 * 86400) {
      throw new Error('publish time cannot exceed 14 days');
    }
  }

  function extractHashtagNames(text) {
    return Array.from(String(text || '').matchAll(/#([^\s#]+)/g)).map(function (match) {
      return match[1];
    });
  }

  function parseTextExtra(_text, hashtags) {
    return (hashtags || []).map(function (tag) {
      return {
        type: 1,
        hashtag_id: tag.id,
        hashtag_name: tag.name,
        start: tag.start,
        end: tag.end,
        caption_start: 0,
        caption_end: tag.end - tag.start
      };
    });
  }

  function ensureInvoke() {
    if (window.__MEDIAUSE__ && typeof window.__MEDIAUSE__.invoke === 'function') {
      return window.__MEDIAUSE__.invoke.bind(window.__MEDIAUSE__);
    }
    if (typeof window.__mediauseInvoke === 'function') {
      return window.__mediauseInvoke;
    }
    throw new Error('MediaUse invoke bridge is not available');
  }

  function ensureCdp() {
    var mediause = window.__MEDIAUSE__ || {};
    var cdp = mediause.cdp || {};
    var invoke = null;
    try {
      invoke = ensureInvoke();
    } catch (_error) {
      invoke = null;
    }
    var evalFn = typeof cdp.eval === 'function' ? cdp.eval : cdp.evaluate;
    if (!invoke || typeof cdp.createWindow !== 'function' || typeof cdp.goto !== 'function' || typeof cdp.waitForSelector !== 'function' || typeof cdp.setInputFiles !== 'function' || typeof evalFn !== 'function') {
      throw new Error('__MEDIAUSE__.cdp is not available');
    }
    return {
      cdp: cdp,
      invoke: invoke,
      evaluate: evalFn
    };
  }

  async function invokeOrThrow(command, payload) {
    var fn = ensureInvoke();
    return fn(command, payload || {});
  }

  async function getTempDir() {
    if (window.__MEDIAUSE__ && window.__MEDIAUSE__.path && typeof window.__MEDIAUSE__.path.tempDir === 'function') {
      return window.__MEDIAUSE__.path.tempDir();
    }
    return invokeOrThrow('get_temp_dir', {});
  }

  async function getFileInfo(filePath) {
    return invokeOrThrow('get_file_info', { filePath: filePath });
  }

  async function readFileChunk(filePath, start, length) {
    var chunk = await invokeOrThrow('read_file_chunk', {
      filePath: filePath,
      start: start,
      length: length
    });
    return new Uint8Array(Array.isArray(chunk) ? chunk : []);
  }

  async function calcMd5FromBytes(bytes) {
    return invokeOrThrow('calc_md5', {
      data: Array.from(bytes || [])
    });
  }

  function bytesToHex(bytes) {
    return Array.from(bytes || []).map(function (byte) {
      return byte.toString(16).padStart(2, '0');
    }).join('');
  }

  function utf8Bytes(value) {
    return encoder.encode(String(value == null ? '' : value));
  }

  function toBytes(value) {
    if (value instanceof Uint8Array) {
      return value;
    }
    if (value instanceof ArrayBuffer) {
      return new Uint8Array(value);
    }
    return utf8Bytes(value);
  }

  async function sha256Hex(data) {
    var digest = await crypto.subtle.digest('SHA-256', toBytes(data));
    return bytesToHex(new Uint8Array(digest));
  }

  async function hmacSha256(key, data) {
    var cryptoKey = await crypto.subtle.importKey(
      'raw',
      toBytes(key),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    var signature = await crypto.subtle.sign('HMAC', cryptoKey, toBytes(data));
    return new Uint8Array(signature);
  }

  function detectContentType(filePath) {
    var path = String(filePath || '').toLowerCase();
    if (path.endsWith('.png')) return 'image/png';
    if (path.endsWith('.gif')) return 'image/gif';
    if (path.endsWith('.webp')) return 'image/webp';
    if (path.endsWith('.mp4')) return 'video/mp4';
    if (path.endsWith('.mov')) return 'video/quicktime';
    if (path.endsWith('.avi')) return 'video/x-msvideo';
    if (path.endsWith('.webm')) return 'video/webm';
    return 'application/octet-stream';
  }

  function extractRegionFromHost(host) {
    var match = String(host || '').match(/^tos-([^.]+)\./);
    return match && match[1] ? match[1] : 'cn-north-1';
  }

  function xmlEscape(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function nowAwsDate() {
    return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
  }

  async function computeAws4Headers(options) {
    var method = String(options.method || 'GET').toUpperCase();
    var url = new URL(options.url);
    var bodyBytes = options.body == null ? utf8Bytes('') : toBytes(options.body);
    var headerInput = Object.assign({}, options.headers || {});
    var datetime = options.datetime || nowAwsDate();
    var date = datetime.slice(0, 8);
    var bodyHash = await sha256Hex(bodyBytes);

    headerInput.host = url.host;
    headerInput['x-amz-content-sha256'] = bodyHash;
    headerInput['x-amz-date'] = datetime;
    headerInput['x-amz-security-token'] = options.credentials.session_token;

    var canonicalKeys = Object.keys(headerInput).sort(function (a, b) {
      return a.toLowerCase().localeCompare(b.toLowerCase());
    });
    var canonicalHeaders = canonicalKeys.map(function (key) {
      return key.toLowerCase() + ':' + String(headerInput[key]).trim();
    }).join('\n') + '\n';
    var signedHeaders = canonicalKeys.map(function (key) {
      return key.toLowerCase();
    }).join(';');
    var canonicalQuery = Array.from(url.searchParams.entries())
      .sort(function (a, b) { return a[0].localeCompare(b[0]); })
      .map(function (entry) {
        return encodeURIComponent(entry[0]) + '=' + encodeURIComponent(entry[1]);
      })
      .join('&');
    var canonicalRequest = [
      method,
      url.pathname || '/',
      canonicalQuery,
      canonicalHeaders,
      signedHeaders,
      bodyHash
    ].join('\n');
    var credentialScope = date + '/' + options.region + '/' + options.service + '/aws4_request';
    var stringToSign = [
      'AWS4-HMAC-SHA256',
      datetime,
      credentialScope,
      await sha256Hex(canonicalRequest)
    ].join('\n');
    var kDate = await hmacSha256('AWS4' + options.credentials.secret_access_key, date);
    var kRegion = await hmacSha256(kDate, options.region);
    var kService = await hmacSha256(kRegion, options.service);
    var kSigning = await hmacSha256(kService, 'aws4_request');
    var signature = bytesToHex(await hmacSha256(kSigning, stringToSign));

    headerInput.Authorization = 'AWS4-HMAC-SHA256 Credential=' + options.credentials.access_key_id + '/' + credentialScope + ', SignedHeaders=' + signedHeaders + ', Signature=' + signature;
    return headerInput;
  }

  async function fetchText(url, options) {
    var response = await fetch(url, options || {});
    var text = await response.text();
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + url + ': ' + text.slice(0, 400));
    }
    return text;
  }

  async function creatorFetch(method, url, options) {
    var init = options || {};
    var headers = Object.assign({
      'Content-Type': 'application/json'
    }, init.headers || {});
    var body = init.body;
    var response = await fetch(url, {
      method: method,
      credentials: 'include',
      headers: headers,
      body: body == null ? undefined : (init.rawBody ? body : JSON.stringify(body))
    });
    var text = await response.text();
    if (!response.ok) {
      throw new Error('HTTP ' + response.status + ' for ' + url + ': ' + text.slice(0, 400));
    }
    var data = text ? JSON.parse(text) : {};
    if (data && typeof data === 'object' && Object.prototype.hasOwnProperty.call(data, 'status_code') && Number(data.status_code) !== 0) {
      throw new Error('Douyin API error ' + data.status_code + ': ' + (data.status_msg || 'unknown error'));
    }
    return data;
  }

  async function publicFetch(method, url, options) {
    return creatorFetch(method, url, options);
  }

  async function getSts2Credentials() {
    var result = await fetch(CREATOR_BASE + '/aweme/mid/video/sts2/?scene=web&aid=' + AID_CREATOR + '&cookie_enabled=true&device_platform=web', {
      credentials: 'include'
    });
    var payload = await result.json();
    var credentials = payload && payload.data ? payload.data : payload;
    if (!credentials || !credentials.access_key_id) {
      throw new Error('creator.douyin.com STS2 credentials missing');
    }
    return credentials;
  }

  async function initMultipartUpload(tosUrl, auth, credentials) {
    var initUrl = tosUrl + '?uploads';
    var headers = {
      Authorization: auth,
      'x-amz-date': nowAwsDate(),
      'x-amz-security-token': credentials.session_token,
      'content-type': 'application/octet-stream'
    };
    var xml = await fetchText(initUrl, {
      method: 'POST',
      headers: headers,
      body: ''
    });
    var match = xml.match(/<UploadId>([^<]+)<\/UploadId>/);
    if (!match || !match[1]) {
      throw new Error('TOS init response missing UploadId');
    }
    return match[1];
  }

  async function uploadPart(tosUrl, partNumber, uploadId, data, credentials, region) {
    var url = new URL(tosUrl);
    url.searchParams.set('partNumber', String(partNumber));
    url.searchParams.set('uploadId', uploadId);
    var headers = await computeAws4Headers({
      method: 'PUT',
      url: url.toString(),
      headers: { 'content-type': 'application/octet-stream' },
      body: data,
      credentials: credentials,
      service: 'tos',
      region: region,
      datetime: nowAwsDate()
    });
    var response = await fetch(url.toString(), {
      method: 'PUT',
      headers: headers,
      body: data
    });
    if (!response.ok) {
      throw new Error('TOS upload part ' + partNumber + ' failed with status ' + response.status);
    }
    var etag = response.headers.get('etag');
    if (!etag) {
      throw new Error('TOS upload part ' + partNumber + ' response missing ETag');
    }
    return etag;
  }

  async function completeMultipartUpload(tosUrl, uploadId, parts, credentials, region) {
    var url = new URL(tosUrl);
    url.searchParams.set('uploadId', uploadId);
    var xmlBody = '<CompleteMultipartUpload>' + parts.slice().sort(function (a, b) {
      return a.partNumber - b.partNumber;
    }).map(function (part) {
      return '<Part><PartNumber>' + part.partNumber + '</PartNumber><ETag>' + xmlEscape(part.etag) + '</ETag></Part>';
    }).join('') + '</CompleteMultipartUpload>';
    var headers = await computeAws4Headers({
      method: 'POST',
      url: url.toString(),
      headers: { 'content-type': 'application/xml' },
      body: xmlBody,
      credentials: credentials,
      service: 'tos',
      region: region,
      datetime: nowAwsDate()
    });
    await fetchText(url.toString(), {
      method: 'POST',
      headers: headers,
      body: xmlBody
    });
  }

  async function uploadLocalFileToTos(filePath, uploadInfo, credentials) {
    var fileInfo = await getFileInfo(filePath);
    if (!fileInfo || !Number(fileInfo.size)) {
      throw new Error('file info missing for ' + filePath);
    }
    var partSize = 5 * 1024 * 1024;
    var totalParts = Math.ceil(fileInfo.size / partSize);
    var uploadId = await initMultipartUpload(uploadInfo.tos_upload_url, uploadInfo.auth, credentials);
    var region = extractRegionFromHost(new URL(uploadInfo.tos_upload_url).host);
    var parts = [];

    for (var partNumber = 1; partNumber <= totalParts; partNumber += 1) {
      var offset = (partNumber - 1) * partSize;
      var chunkSize = Math.min(partSize, Number(fileInfo.size) - offset);
      var bytes = await readFileChunk(filePath, offset, chunkSize);
      var etag = await uploadPart(uploadInfo.tos_upload_url, partNumber, uploadId, bytes, credentials, region);
      parts.push({ partNumber: partNumber, etag: etag });
    }

    await completeMultipartUpload(uploadInfo.tos_upload_url, uploadId, parts, credentials, region);
  }

  async function uploadCoverToImagex(coverPath) {
    var fileInfo = await getFileInfo(coverPath);
    if (!fileInfo || !Number(fileInfo.size)) {
      throw new Error('cover file info missing');
    }
    var applyUrl = 'https://imagex.bytedanceapi.com/?Action=ApplyImageUpload&ServiceId=1147&Version=2018-08-01&UploadNum=1';
    var applyResult = await fetch(applyUrl, { credentials: 'include' }).then(function (response) { return response.json(); });
    var storeInfos = applyResult && applyResult.Result && applyResult.Result.UploadAddress ? applyResult.Result.UploadAddress.StoreInfos : [];
    if (!storeInfos || !storeInfos[0]) {
      throw new Error('imagex apply upload failed');
    }
    var uploadUrl = 'https://' + storeInfos[0].UploadHost + '/' + storeInfos[0].StoreUri;
    var bytes = await readFileChunk(coverPath, 0, Number(fileInfo.size));
    var response = await fetch(uploadUrl, {
      method: 'PUT',
      headers: {
        'Content-Type': detectContentType(coverPath),
        'Content-Length': String(bytes.byteLength)
      },
      body: bytes
    });
    if (!response.ok) {
      throw new Error('imagex upload failed with status ' + response.status);
    }
    var commitUrl = 'https://imagex.bytedanceapi.com/?Action=CommitImageUpload&ServiceId=1147&Version=2018-08-01';
    await fetch(commitUrl, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ SuccessObjKeys: [storeInfos[0].StoreUri] })
    }).then(function (res) {
      if (!res.ok) {
        throw new Error('imagex commit failed with status ' + res.status);
      }
      return res.json();
    });
    return storeInfos[0].StoreUri;
  }

  async function pollTranscode(videoId, timeoutMs) {
    var deadline = Date.now() + (timeoutMs || 300000);
    while (Date.now() < deadline) {
      var result = await creatorFetch('GET', CREATOR_BASE + '/web/api/media/video/transend/?video_id=' + encodeURIComponent(videoId) + '&aid=' + AID_CREATOR);
      if (Number(result.encode) === 2) {
        return result;
      }
      await wait(3000);
    }
    throw new Error('Douyin transcode timed out for ' + videoId);
  }

  function normalizeVideoStatus(status, publicTime) {
    if (typeof status === 'number') {
      return status;
    }
    if (!status) {
      return publicTime && publicTime > Date.now() / 1000 ? 'scheduled' : 'published';
    }
    if (status.is_delete) return 'deleted';
    if (status.is_prohibited) return 'prohibited';
    if (status.in_reviewing) return 'reviewing';
    if (status.is_private) return 'private';
    if (publicTime && publicTime > Date.now() / 1000) return 'scheduled';
    return 'published';
  }

  function statusFilterToCode(status) {
    return {
      all: 0,
      published: 1,
      reviewing: 3,
      scheduled: 0
    }[String(status || 'all')] || 0;
  }

  async function fetchCreatorProfile() {
    var result = await creatorFetch('GET', CREATOR_BASE + '/web/api/media/user/info/?aid=' + AID_CREATOR);
    var user = result.user_info || result.user;
    if (!user) {
      throw new Error('creator user info missing, please confirm login');
    }
    return user;
  }

  async function fetchDouyinUserVideos(secUid, count) {
    var params = new URLSearchParams({
      sec_user_id: secUid,
      max_cursor: '0',
      count: String(count),
      aid: AID_PUBLIC
    });
    var result = await publicFetch('GET', 'https://www.douyin.com/aweme/v1/web/aweme/post/?' + params.toString(), {
      headers: { referer: 'https://www.douyin.com/' }
    });
    return result.aweme_list || [];
  }

  async function fetchDouyinComments(awemeId, count) {
    var params = new URLSearchParams({
      aweme_id: awemeId,
      count: String(count),
      cursor: '0',
      aid: AID_PUBLIC
    });
    var result = await publicFetch('GET', 'https://www.douyin.com/aweme/v1/web/comment/list/?' + params.toString(), {
      headers: { referer: 'https://www.douyin.com/' }
    });
    return (result.comments || []).slice(0, count).map(function (comment) {
      return {
        text: comment.text || '',
        digg_count: comment.digg_count || 0,
        nickname: comment.user && comment.user.nickname ? comment.user.nickname : ''
      };
    });
  }

  async function mapInBatches(items, concurrency, mapper) {
    var results = [];
    for (var index = 0; index < items.length; index += concurrency) {
      var chunk = items.slice(index, index + concurrency);
      var chunkResult = await Promise.all(chunk.map(mapper));
      Array.prototype.push.apply(results, chunkResult);
    }
    return results;
  }

  window.__mediauseDouyinV2Helpers = {
    AID_CREATOR: AID_CREATOR,
    CREATOR_BASE: CREATOR_BASE,
    DRAFT_UPLOAD_URL: DRAFT_UPLOAD_URL,
    VISIBILITY_MAP: VISIBILITY_MAP,
    VISIBILITY_LABELS: VISIBILITY_LABELS,
    errorResult: errorResult,
    ok: ok,
    okItems: okItems,
    wait: wait,
    compactText: compactText,
    sanitizeLimit: sanitizeLimit,
    isTruthy: isTruthy,
    formatZhTime: formatZhTime,
    toUnixSeconds: toUnixSeconds,
    validateTiming: validateTiming,
    extractHashtagNames: extractHashtagNames,
    parseTextExtra: parseTextExtra,
    ensureInvoke: ensureInvoke,
    ensureCdp: ensureCdp,
    invokeOrThrow: invokeOrThrow,
    getTempDir: getTempDir,
    getFileInfo: getFileInfo,
    readFileChunk: readFileChunk,
    calcMd5FromBytes: calcMd5FromBytes,
    detectContentType: detectContentType,
    creatorFetch: creatorFetch,
    publicFetch: publicFetch,
    getSts2Credentials: getSts2Credentials,
    uploadLocalFileToTos: uploadLocalFileToTos,
    uploadCoverToImagex: uploadCoverToImagex,
    pollTranscode: pollTranscode,
    normalizeVideoStatus: normalizeVideoStatus,
    statusFilterToCode: statusFilterToCode,
    fetchCreatorProfile: fetchCreatorProfile,
    fetchDouyinUserVideos: fetchDouyinUserVideos,
    fetchDouyinComments: fetchDouyinComments,
    mapInBatches: mapInBatches
  };
})();
