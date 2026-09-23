// ABOUTME: Cloudflare Worker for roux.dunn.us: serves the static game and rewrites link-preview tags on challenge links.
// ABOUTME: A shared link like /?d=12&s=241 previews as "Beat 241 on Roux Wars #12" in iMessage, WhatsApp, etc.
import { metaFor } from './src/share.js';
import { dailyNumber } from './src/daily.js';

const setContent = (value) => ({
  element(el) {
    el.setAttribute('content', value);
  },
});

export default {
  async fetch(request, env) {
    const response = await env.ASSETS.fetch(request);
    const url = new URL(request.url);
    if (url.pathname !== '/' || !url.searchParams.has('s')) return response;

    const { title, description } = metaFor(url.search, dailyNumber());
    return new HTMLRewriter()
      .on('title', {
        element(el) {
          el.setInnerContent(title);
        },
      })
      .on('meta[property="og:title"]', setContent(title))
      .on('meta[name="twitter:title"]', setContent(title))
      .on('meta[property="og:description"]', setContent(description))
      .on('meta[property="og:url"]', setContent(url.href))
      .transform(response);
  },
};
