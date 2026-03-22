/**
 * Extracts and cleans Groovydoc comments from source code
 */
export class GroovydocParser {
  /**
   * Extract Groovydoc for a symbol in text with optional parameter matching
   */
  public extractGroovydocForSymbolInText(text: string, symbol: string, args?: string[]): string | undefined {
    // Search for common definition patterns and look for a /** ... */ block immediately above
    // If args are provided, match the correct overload by parameter count
    const defPatterns = [
      new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:abstract|final)?\\s*(?:class|interface|enum|trait)\\s+${symbol}\\b`, 'g'),
      new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+(?:<[^>]*>)?)\\s+${symbol}\\s*\\(`, 'g'),
      new RegExp(`(?:^|\\n)\\s*(?:def\\s+)?${symbol}\\s*\\(`, 'g')
    ];

    for (const pattern of defPatterns) {
      let m;
      while ((m = pattern.exec(text)) !== null) {
        const defIndex = m.index;

        const commentEnd = text.lastIndexOf('*/', defIndex);
        if (commentEnd === -1) { continue; }
        const commentStart = text.lastIndexOf('/**', commentEnd);
        if (commentStart === -1) { continue; }

        // Ensure only whitespace/annotations between comment end and definition
        const between = text.substring(commentEnd + 2, defIndex);
        if (!/^[\s@]*$/.test(between)) { continue; }

        // If args are provided, check if this definition matches the parameter count (overload matching)
        if (args !== undefined && m[0].indexOf('(') !== -1) {
          // This looks like a method definition, extract parameter list
          const paramStart = defIndex + m[0].length - 1; // Position of opening paren
          const paramEnd = this.findMatchingParenthesis(text, paramStart);
          if (paramEnd !== -1) {
            const paramList = text.substring(paramStart + 1, paramEnd);
            const expectedParams = this.parseMethodParameters(paramList);

            // Check if parameter count matches (considering default parameters)
            if (!this.matchesParameterCount(expectedParams, args.length)) {
              continue;
            }
          }
        }

        const raw = text.substring(commentStart, commentEnd + 2);
        return this.cleanGroovydoc(raw);
      }
    }

    return undefined;
  }

  /**
   * Clean Groovydoc by stripping comment delimiters and leading asterisks on each line
   */
  public cleanGroovydoc(raw: string): string {
    // Strip /** and */ and leading * on each line
    let inner = raw.replace(/^\/\*\*/s, '').replace(/\*\/$/s, '');
    const lines = inner.split(/\r?\n/).map(l => l.replace(/^\s*\*\s?/, '')).map(l => l.replace(/^\s+|\s+$/g, ''));
    return lines.join('\n').trim();
  }

  /**
   * Find matching closing parenthesis
   */
  private findMatchingParenthesis(text: string, startIndex: number): number {
    let depth = 0;
    for (let i = startIndex; i < text.length; i++) {
      if (text[i] === '(') {
        depth++;
      } else if (text[i] === ')') {
        depth--;
        if (depth === 0) {
          return i;
        }
      }
    }
    return -1;
  }

  /**
   * Parse method parameters from parameter list string
   */
  private parseMethodParameters(paramList: string): string[] {
    // Simple parameter parsing - split by commas but handle defaults
    const params: string[] = [];
    let current = '';
    let depth = 0;

    for (let i = 0; i < paramList.length; i++) {
      const char = paramList[i];
      if (char === '(' || char === '[') {
        depth++;
        current += char;
      } else if (char === ')' || char === ']') {
        depth--;
        current += char;
      } else if (char === ',' && depth === 0) {
        params.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    if (current.trim()) {
      params.push(current.trim());
    }

    return params;
  }

  /**
   * Check if parameter count matches (considering default parameters)
   */
  private matchesParameterCount(expectedParams: string[], actualCount: number): boolean {
    // Count required parameters (those without default values)
    let requiredCount = 0;
    for (const param of expectedParams) {
      if (!param.includes('=')) {
        requiredCount++;
      }
    }

    // Allow calls with required params up to total params
    return actualCount >= requiredCount && actualCount <= expectedParams.length;
  }
}
