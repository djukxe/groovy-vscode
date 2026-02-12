// Utility functions for the Groovy language server
// These can be tested independently of the LSP server setup

/**
 * Determines whether the actual number of arguments matches the expected parameters.
 * Accounts for parameters with default values, which are optional.
 *
 * @param expectedParams - An array of parameter declarations, where parameters with default values contain '='
 * @param actualArgCount - The number of arguments provided in the function call
 * @returns `true` if the actual argument count is valid for the expected parameters, `false` otherwise
 *
 * @example
 * // Returns true - 1 argument matches 1 required parameter
 * matchesParameterCount(['x'], 1)
 *
 * @example
 * // Returns true - 1 argument matches 1 required parameter (y has default)
 * matchesParameterCount(['x', 'y = 5'], 1)
 *
 * @example
 * // Returns false - 3 arguments exceed 2 total parameters
 * matchesParameterCount(['x', 'y = 5'], 3)
 */
export function matchesParameterCount(expectedParams: string[], actualArgCount: number): boolean {
  const paramCount = expectedParams.length;

  // If no parameters expected, only match calls with no arguments
  if (paramCount === 0) {
    return actualArgCount === 0;
  }

  // Count how many parameters have default values (contain '=')
  let requiredParamCount = 0;
  for (const param of expectedParams) {
    if (!param.includes('=')) {
      requiredParamCount++;
    }
  }

  // Match if actual args are between required params and total params
  return actualArgCount >= requiredParamCount && actualArgCount <= paramCount;
}

export function parseMethodParameters(paramList: string): string[] {
  if (!paramList.trim()) {
    return [];
  }

  // Simple parameter parsing - split by commas but handle types
  const params: string[] = [];
  let currentParam = '';
  let parenDepth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < paramList.length; i++) {
    const char = paramList[i];

    if (inString) {
      currentParam += char;
      if (char === stringChar && paramList[i - 1] !== '\\') {
        inString = false;
        stringChar = '';
      }
    } else {
      if ((char === '"' || char === "'") && paramList[i - 1] !== '\\') {
        inString = true;
        stringChar = char;
        currentParam += char;
      } else if (char === '(') {
        parenDepth++;
        currentParam += char;
      } else if (char === ')') {
        parenDepth--;
        currentParam += char;
      } else if (char === ',' && parenDepth === 0) {
        params.push(currentParam.trim());
        currentParam = '';
      } else {
        currentParam += char;
      }
    }
  }

  if (currentParam.trim()) {
    params.push(currentParam.trim());
  }

  return params;
}

export function findMatchingParenthesis(text: string, openParenPos: number): number {
  let depth = 0;
  for (let i = openParenPos; i < text.length; i++) {
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

export function findMethodSignature(text: string, symbol: string, args: string[]): string | null {
  const methodPatterns = [
    // Standard method with return type
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+(?:<[^>]*>)?(?:\\s*<[^>]*>)*)\\s+${symbol}\\s*\\([^)]*\\)\\s*\\{`, 'g'),
    // Method without explicit return type (property-like methods)
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*${symbol}\\s*\\([^)]*\\)\\s*\\{`, 'g')
  ];

  const matchingSignatures: string[] = [];

  for (const methodRegex of methodPatterns) {
    let match;
    while ((match = methodRegex.exec(text)) !== null) {
      // Find the opening paren position
      const openParenIndex = match[0].indexOf('(');
      const paramStart = match.index + openParenIndex;
      const paramEnd = findMatchingParenthesis(text, paramStart);
      if (paramEnd !== -1) {
        const paramList = text.substring(paramStart + 1, paramEnd);
        const expectedParams = parseMethodParameters(paramList);

        // Check if parameter count matches (considering default parameters)
        if (matchesParameterCount(expectedParams, args.length)) {
          // Return the full signature (up to closing paren)
          const signatureStart = match.index;
          const signatureEnd = paramEnd + 1; // Include closing parenthesis
          const signature = text.substring(signatureStart, signatureEnd).trim();
          matchingSignatures.push(signature);
        }
      }
    }
  }

  if (matchingSignatures.length === 0) {
    return null;
  }

  if (matchingSignatures.length === 1) {
    return matchingSignatures[0];
  }

  // Multiple matches - try to choose the best one
  // For map arguments, prefer Map parameters over other types
  if (args.length === 1 && args[0].startsWith('[') && args[0].endsWith(']')) {
    const mapSignature = matchingSignatures.find(sig => sig.includes('Map '));
    if (mapSignature) {
      return mapSignature;
    }
  }

  // Otherwise, return the first one (maintains backward compatibility)
  return matchingSignatures[0];
}
/**
 * Calculates the line and character position of a symbol within a text.
 * Given a regex match result, finds where the symbol name actually appears
 * and returns the precise line and character coordinates.
 *
 * @param match - The RegExpExecArray result from a regex match
 * @param symbol - The symbol name to locate within the match
 * @param text - The full text being searched
 * @returns An object with `line` and `character` properties indicating the position
 */
export function getSymbolPosition(match: RegExpExecArray, symbol: string, text: string): { line: number; character: number } {
  const symbolPosInMatch = match[0].lastIndexOf(symbol);
  const actualSymbolIndex = match.index + symbolPosInMatch;

  const linesBeforeSymbol = text.substring(0, actualSymbolIndex).split('\n');
  const line = linesBeforeSymbol.length - 1;
  const character = linesBeforeSymbol[linesBeforeSymbol.length - 1].length;
  return { line, character };
}
