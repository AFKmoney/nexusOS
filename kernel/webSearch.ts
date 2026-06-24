// ═══════════════════════════════════════════════════════════════════
// WEB SEARCH KERNEL MODULE — AI-driven web search
//
// Gives the AI the ability to search the web and receive structured
// results. Uses DuckDuckGo's Instant Answer API (free, no key required)
// as the primary backend, with the HTML search endpoint as a fallback
// for when the instant answer API returns nothing.
//
// Used by OS::WEB_SEARCH:<query> to let the AI research topics
// autonomously — a capability that was missing from the original
// pipeline (the AI could browse to a URL but could not search).
// ═══════════════════════════════════════════════════════════════════

import { kernelLog } from './log';

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
}

class WebSearchEngine {
  /**
   * Search the web for a query and return structured results.
   * Tries DuckDuckGo Instant Answer API first, then falls back to
   * scraping the DuckDuckGo HTML search page (which doesn't require
   * an API key).
   */
  async search(query: string, maxResults = 8): Promise<SearchResult[]> {
    const trimmed = query.trim();
    if (!trimmed) return [];

    // Route 1: DuckDuckGo Instant Answer API (JSON, no key)
    try {
      const iaResults = await this.searchDuckDuckGoIA(trimmed);
      if (iaResults.length > 0) return iaResults.slice(0, maxResults);
    } catch (e: any) {
      kernelLog.warn('[WebSearch] DuckDuckGo IA failed:', e.message);
    }

    // Route 2: DuckDuckGo HTML scrape via CORS proxy
    try {
      const htmlResults = await this.searchDuckDuckGoHTML(trimmed, maxResults);
      if (htmlResults.length > 0) return htmlResults;
    } catch (e: any) {
      kernelLog.warn('[WebSearch] DuckDuckGo HTML failed:', e.message);
    }

    return [];
  }

  private async searchDuckDuckGoIA(query: string): Promise<SearchResult[]> {
    const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) throw new Error(`DDG IA returned ${resp.status}`);
    const data = await resp.json();

    const results: SearchResult[] = [];

    // Abstract (main answer)
    if (data.AbstractText) {
      results.push({
        title: data.Heading || query,
        url: data.AbstractURL || '',
        snippet: data.AbstractText,
        source: data.AbstractSource || 'DuckDuckGo',
      });
    }

    // Related topics
    if (Array.isArray(data.RelatedTopics)) {
      for (const topic of data.RelatedTopics) {
        if (topic.Text && topic.FirstURL) {
          results.push({
            title: topic.Text.split(' - ')[0] || topic.Text.slice(0, 80),
            url: topic.FirstURL,
            snippet: topic.Text,
            source: 'DuckDuckGo',
          });
        }
        if (results.length >= 8) break;
      }
    }

    return results;
  }

  private async searchDuckDuckGoHTML(query: string, maxResults: number): Promise<SearchResult[]> {
    // DuckDuckGo HTML endpoint, fetched via a CORS proxy.
    // This is the fallback when the IA API returns nothing (which is
    // common for technical queries). We parse the HTML to extract
    // result links and snippets.
    const proxies = [
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?',
    ];
    const ddgUrl = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;

    for (const proxy of proxies) {
      try {
        const resp = await fetch(proxy + encodeURIComponent(ddgUrl), {
          signal: AbortSignal.timeout(10000),
        });
        if (!resp.ok) continue;
        const html = await resp.text();
        return this.parseDdgHtml(html, maxResults);
      } catch {
        continue;
      }
    }
    return [];
  }

  private parseDdgHtml(html: string, maxResults: number): SearchResult[] {
    const results: SearchResult[] = [];
    // DuckDuckGo HTML results are in <a class="result__a" href="...">
    const linkRegex = /<a[^>]+class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g;
    const snippetRegex = /<a[^>]+class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;

    const links: { url: string; title: string }[] = [];
    let match: RegExpExecArray | null;
    while ((match = linkRegex.exec(html)) !== null) {
      const rawUrl = match[1]!;
      const title = match[2]!.replace(/<[^>]+>/g, '').trim();
      // DDG wraps URLs in a redirect — extract the actual URL
      const urlMatch = rawUrl.match(/uddg=([^&]+)/);
      const url = urlMatch ? decodeURIComponent(urlMatch[1]!) : rawUrl;
      if (title && url) links.push({ url, title });
    }

    const snippets: string[] = [];
    while ((match = snippetRegex.exec(html)) !== null) {
      snippets.push(match[1]!.replace(/<[^>]+>/g, '').trim());
    }

    for (let i = 0; i < Math.min(links.length, maxResults); i++) {
      results.push({
        title: links[i]!.title,
        url: links[i]!.url,
        snippet: snippets[i]! || '',
        source: 'DuckDuckGo',
      });
    }

    return results;
  }

  /** Format search results as a readable string for the AI context. */
  formatResults(results: SearchResult[]): string {
    if (results.length === 0) return 'No results found.';
    return results.map((r, i) =>
      `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet.slice(0, 200)}`
    ).join('\n\n');
  }
}

export const webSearch = new WebSearchEngine();
