/**
 * Sanitizer - 安全工具类
 */
export class Sanitizer {
  private static readonly HTML_ENTITIES: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
    '/': '&#x2F;',
    '`': '&#x60;',
    '=': '&#x3D;'
  };

  static escapeHtml(text: string): string {
    if (!text) return '';
    return text.replace(/[&<>"'`=/]/g, char => this.HTML_ENTITIES[char] || char);
  }

  static stripHtml(text: string): string {
    if (!text) return '';
    return text.replace(/<[^>]*>/g, '');
  }

  static sanitizeUrl(url: string): string {
    if (!url) return '';
    const trimmed = url.trim().toLowerCase();
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'about:'];
    for (const protocol of dangerousProtocols) {
      if (trimmed.startsWith(protocol)) return '';
    }
    return url;
  }

  static highlightText(text: string, searchTerm: string, options?: {
    caseSensitive?: boolean;
    highlightClass?: string;
  }): string {
    if (!text || !searchTerm) return this.escapeHtml(text);
    
    const { caseSensitive = false, highlightClass = 'highlight' } = options || {};
    const escapedText = this.escapeHtml(text);
    const escapedSearch = this.escapeHtml(searchTerm);
    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(`(${this.escapeRegex(escapedSearch)})`, flags);
    
    return escapedText.replace(regex, `<mark class="${highlightClass}">$1</mark>`);
  }

  private static escapeRegex(text: string): string {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
