/**
 * Free Web Search Client
 * Queries public endpoints (DuckDuckGo Instant Answer & HTML endpoint) without paid API keys.
 */
export class WebSearchClient {
  constructor() {
    this.instantApiUrl = 'https://api.duckduckgo.com/';
    this.htmlSearchUrl = 'https://html.duckduckgo.com/html/';
    this.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36';
  }

  /**
   * Search DuckDuckGo Instant Answer API
   */
  async searchInstant(query) {
    const params = new URLSearchParams({
      q: query,
      format: 'json',
      no_html: '1',
      skip_disambig: '1'
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${this.instantApiUrl}?${params.toString()}`, {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) return [];
      const data = await res.json();
      const results = [];

      if (data.AbstractText) {
        results.push({
          source: 'DuckDuckGo Knowledge',
          title: data.Heading || query,
          snippet: data.AbstractText,
          url: data.AbstractURL || '',
          sourceName: data.AbstractSource || 'Web'
        });
      }

      if (Array.isArray(data.RelatedTopics)) {
        for (const topic of data.RelatedTopics.slice(0, 3)) {
          if (topic.Text && topic.FirstURL) {
            results.push({
              source: 'DuckDuckGo Related',
              title: topic.Text.split(' - ')[0] || query,
              snippet: topic.Text,
              url: topic.FirstURL,
              sourceName: 'DuckDuckGo'
            });
          }
        }
      }

      return results;
    } catch {
      return [];
    }
  }

  /**
   * Search DuckDuckGo HTML endpoint for rich web listings
   */
  async searchWeb(query, limit = 5) {
    try {
      // First try Instant Answers
      const instant = await this.searchInstant(query);
      if (instant.length >= limit) {
        return instant.slice(0, limit);
      }

      // Query HTML endpoint
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const body = new URLSearchParams({ q: query });

      const res = await fetch(this.htmlSearchUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': this.userAgent
        },
        body: body.toString(),
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) return instant;
      const html = await res.text();

      // Extract results from HTML using regex (zero external DOM dependencies)
      const results = [...instant];
      const resultBlockRegex = /<a[^>]+class="result__url"[^>]+href="([^"]+)"[^>]*>([\s\S]*?)<\/a>[\s\S]*?<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;

      let match;
      while ((match = resultBlockRegex.exec(html)) !== null && results.length < limit) {
        let rawUrl = match[1];
        // Decode DDG redirect URL if present
        if (rawUrl.includes('uddg=')) {
          const uddgMatch = rawUrl.match(/uddg=([^&]+)/);
          if (uddgMatch) {
            try {
              rawUrl = decodeURIComponent(uddgMatch[1]);
            } catch {
              // keep raw
            }
          }
        }

        const snippet = match[3].replace(/<[^>]+>/g, '').trim();
        const title = match[2].replace(/<[^>]+>/g, '').trim() || query;

        if (rawUrl && snippet) {
          results.push({
            source: 'Web Search',
            title,
            snippet,
            url: rawUrl,
            sourceName: 'Web'
          });
        }
      }

      return results.slice(0, limit);
    } catch {
      return [];
    }
  }
}

export default WebSearchClient;
