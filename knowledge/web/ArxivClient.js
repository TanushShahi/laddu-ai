/**
 * Free arXiv Client
 * Queries arXiv API for scientific and computing research papers (zero API keys).
 */
export class ArxivClient {
  constructor() {
    this.baseUrl = 'http://export.arxiv.org/api/query';
  }

  /**
   * Search arXiv for papers
   * @param {string} query
   * @param {number} [maxResults=3]
   */
  async search(query, maxResults = 3) {
    const formattedQuery = encodeURIComponent(query);
    const url = `${this.baseUrl}?search_query=all:${formattedQuery}&start=0&max_results=${maxResults}&sortBy=relevance&sortOrder=descending`;

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);

      if (!res.ok) return [];
      const xml = await res.text();

      // Simple regex extraction for arXiv Atom XML entries
      const entries = [];
      const entryRegex = /<entry>([\s\S]*?)<\/entry>/gi;
      let match;

      while ((match = entryRegex.exec(xml)) !== null && entries.length < maxResults) {
        const entryContent = match[1];

        const titleMatch = entryContent.match(/<title>([\s\S]*?)<\/title>/i);
        const summaryMatch = entryContent.match(/<summary>([\s\S]*?)<\/summary>/i);
        const idMatch = entryContent.match(/<id>([\s\S]*?)<\/id>/i);
        const publishedMatch = entryContent.match(/<published>([\s\S]*?)<\/published>/i);

        const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim() : 'Unknown Paper';
        const summary = summaryMatch ? summaryMatch[1].replace(/\s+/g, ' ').trim() : '';
        const paperUrl = idMatch ? idMatch[1].trim() : '';
        const published = publishedMatch ? publishedMatch[1].trim().split('T')[0] : '';

        entries.push({
          source: 'arXiv Academic',
          title,
          snippet: summary.substring(0, 300) + '...',
          url: paperUrl,
          date: published
        });
      }

      return entries;
    } catch {
      return [];
    }
  }
}

export default ArxivClient;
