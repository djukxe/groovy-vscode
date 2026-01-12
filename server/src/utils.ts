// Utility functions for the Groovy language server
// These can be tested independently of the LSP server setup

/**
 * Checks whether a given number of arguments can legally match a function's
 * parameter list, taking default values into account.
 *
 * A parameter is considered optional if it contains a default value (i.e., includes '=').
 * The call is valid if:
 *   - The number of arguments is at least the number of required parameters, and
 *   - The number of arguments does not exceed the total number of parameters.
 *
 * @param expectedParams - The function's parameter definitions as strings.
 *                         Parameters containing '=' are treated as optional.
 * @param actualArgCount - The number of arguments supplied at the call site.
 * @returns `true` if the argument count is compatible with the parameters; otherwise `false`.
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
/**
 * Parses a method or function parameter list into individual parameter strings.
 *
 * This function splits parameters by commas while correctly handling:
 *   - Nested parentheses (e.g., function types or generics)
 *   - String literals (both single and double quoted, with escaping)
 *
 * Commas inside parentheses or strings are ignored, ensuring only top-level
 * parameters are separated.
 *
 * @param paramList - The raw parameter list as a string (e.g. "a: string, b = func(x, y), c = 'a,b'").
 * @returns An array of trimmed parameter strings. Returns an empty array if the input is empty or whitespace.
 */
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

/**
 * Finds the position of the closing parenthesis that matches a given opening parenthesis.
 *
 * Starting from the specified index, this function tracks nested parentheses and returns
 * the index of the corresponding ')' when the nesting depth returns to zero.
 *
 * If no matching closing parenthesis is found, the function returns -1.
 *
 * @param text - The full text to search within.
 * @param openParenPos - The index of the opening '(' character.
 * @returns The index of the matching ')' character, or -1 if none is found.
 */
export function findMatchingParen(text: string, openParenPos: number): number {
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

/**
 * Finds the best-matching method signature for a given method name and argument list.
 *
 * This function scans the provided source text for method definitions matching the
 * specified symbol (method name), extracts their parameter lists, and filters them
 * based on whether the number of supplied arguments is compatible (taking default
 * parameters into account).
 *
 * If multiple signatures match:
 *   - When a single Map-style argument is detected (e.g., "[key: value]"), the function
 *     prefers signatures that explicitly declare a `Map` parameter.
 *   - Otherwise, the first match is returned to preserve backward compatibility.
 *
 * @param text - The source text to search for method definitions.
 * @param symbol - The method name to match.
 * @param args - The arguments supplied at the call site.
 * @returns The matched method signature (up to and including the closing parenthesis),
 *          or `null` if no compatible signature is found.
 */
export function findMethodSignature(text: string, symbol: string, args: string[]): string | null {
  const methodPatterns = [
    // Standard method with return type
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+(?:<[^>]*>)?(?:\\s*<[^>]*>)*)\\s+${symbol}\\s*\\([^)]*\\)\\s*\\{`, 'g'),
  ];

  const matchingSignatures: string[] = [];

  for (const methodRegex of methodPatterns) {
    let match;
    while ((match = methodRegex.exec(text)) !== null) {
      // Find the opening paren position
      const openParenIndex = match[0].indexOf('(');
      const paramStart = match.index + openParenIndex;
      const paramEnd = findMatchingParen(text, paramStart);
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
