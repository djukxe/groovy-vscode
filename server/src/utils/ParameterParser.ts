/**
 * Handles parsing and matching of method parameters for overload resolution
 */
export class ParameterParser {
  /**
   * Parse method parameters from parameter list string
   */
  public parseMethodParameters(paramList: string): string[] {
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
  public matchesParameterCount(expectedParams: string[], actualCount: number): boolean {
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

  /**
   * Find matching closing parenthesis
   */
  public findMatchingParenthesis(text: string, startIndex: number): number {
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
}
