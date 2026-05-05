

/**
 * Analyzes function calls at cursor positions for hover and definition features
 */
export class CallContextAnalyzer {
  /**
   * Extract function call context from text at given offset
   */
  public extractFunctionCallContext(text: string, offset: number): { symbol: string, fullSymbol: string, args: string[] } | null {
    // Find the function call that contains the offset
    // Look for patterns like: symbol(args) or obj.symbol(args)

    // First, try to find a function call ending at or after the offset
    const functionCallPattern = /\b(?!if\b|while\b|for\b|switch\b|catch\b|return\b)(\w+(?:\.\w+)*)\s*\(((?:[^()]+|\((?:[^()]+|\([^()]*\))*\))*)\)/g;
    let match;

    while ((match = functionCallPattern.exec(text)) !== null) {
      const callStart = match.index;
      const callEnd = match.index + match[0].length;

      // Check if the offset is within this function call
      if (callStart <= offset && offset <= callEnd) {
        const fullSymbol = match[1];
        const argsString = match[2];

        // Extract the actual function name (last part after dots)
        const symbolParts = fullSymbol.split('.');
        const symbol = symbolParts[symbolParts.length - 1];

        // Parse arguments
        const args = this.parseArguments(argsString);

        return { symbol, fullSymbol, args };
      }
    }

    return null;
  }

  /**
   * Parse arguments from argument string
   */
  public parseArguments(argsString: string): string[] {
    if (!argsString.trim()) {
      return [];
    }

    // Simple argument parsing - split by commas but be careful with nested structures
    const args: string[] = [];
    let currentArg = '';
    let parenDepth = 0;
    let bracketDepth = 0;
    let inString = false;
    let stringChar = '';

    for (let i = 0; i < argsString.length; i++) {
      const char = argsString[i];

      if (inString) {
        currentArg += char;
        if (char === stringChar && argsString[i - 1] !== '\\') {
          inString = false;
          stringChar = '';
        }
      } else {
        if ((char === '"' || char === "'") && argsString[i - 1] !== '\\') {
          inString = true;
          stringChar = char;
          currentArg += char;
        } else if (char === '(') {
          parenDepth++;
          currentArg += char;
        } else if (char === ')') {
          parenDepth--;
          currentArg += char;
        } else if (char === '[') {
          bracketDepth++;
          currentArg += char;
        } else if (char === ']') {
          bracketDepth--;
          currentArg += char;
        } else if (char === ',' && parenDepth === 0 && bracketDepth === 0) {
          args.push(currentArg.trim());
          currentArg = '';
        } else {
          currentArg += char;
        }
      }
    }

    if (currentArg.trim()) {
      args.push(currentArg.trim());
    }

    return args;
  }
}
