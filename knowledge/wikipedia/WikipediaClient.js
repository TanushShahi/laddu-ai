/**
 * Free Wikipedia Client
 * Uses public Wikimedia REST API and MediaWiki search endpoints (zero API keys).
 */
export class WikipediaClient {
  constructor() {
    this.baseUrl = 'https://en.wikipedia.org/w/api.php';
    this.restUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary';
    this.userAgent = 'JARVIS-Personal-Assistant/1.0 (Educational open source assistant)';
  }

  /**
   * Search for Wikipedia articles matching a query
   * @param {string} query
   * @param {number} [limit=3]
   * @returns {Promise<Array<{title: string, snippet: string, url: string}>>}
   */
  async search(query, limit = 3) {
    const params = new URLSearchParams({
      action: 'query',
      list: 'search',
      srsearch: query,
      format: 'json',
      srlimit: String(limit),
      origin: '*'
    });

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${this.baseUrl}?${params.toString()}`, {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) return [];
      const data = await res.json();
      const results = data.query?.search || [];

      return results.map(item => ({
        source: 'Wikipedia',
        title: item.title,
        snippet: item.snippet ? item.snippet.replace(/<[^>]+>/g, '') : '',
        url: `https://en.wikipedia.org/wiki/${encodeURIComponent(item.title.replace(/ /g, '_'))}`,
        timestamp: item.timestamp || new Date().toISOString()
      }));
    } catch {
      return [];
    }
  }

  /**
   * Get clean summary extract for a specific title
   */
  async getSummary(title) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 6000);
      const res = await fetch(`${this.restUrl}/${encodeURIComponent(title)}`, {
        headers: { 'User-Agent': this.userAgent },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (!res.ok) return null;
      const data = await res.json();
      return {
        source: 'Wikipedia',
        title: data.title,
        description: data.description || '',
        extract: data.extract || '',
        url: data.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(title)}`,
        thumbnail: data.thumbnail?.source || null
      };
    } catch {
      return null;
    }
  }
}

export default WikipediaClient;
