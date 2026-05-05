import { Hover, HoverParams } from 'vscode-languageserver';
import { ServerContext } from '../core/ServerContext';
import { WorkspaceResolver } from '../core/WorkspaceResolver';
import { CallContextAnalyzer } from '../utils/CallContextAnalyzer';
import { GroovydocParser } from '../utils/GroovydocParser';

/**
 * Provides hover information for Groovy files
 */
export class HoverProvider {
  private readonly callContextAnalyzer: CallContextAnalyzer;
  private readonly groovydocParser: GroovydocParser;
  private readonly workspaceResolver: WorkspaceResolver;

  constructor(private context: ServerContext) {
    this.callContextAnalyzer = new CallContextAnalyzer();
    this.groovydocParser = new GroovydocParser();
    this.workspaceResolver = new WorkspaceResolver(context);
  }

  /**
   * Get hover information for the given position
   */
  public getHover(params: HoverParams): Hover | null {
    const document = this.context.documents.get(params.textDocument.uri);
    if (!document) {
      return null;
    }

    const text = document.getText();
    const offset = document.offsetAt(params.position);

    // First, try to extract function call context for signature information
    const functionCallContext = this.callContextAnalyzer.extractFunctionCallContext(text, offset);
    if (functionCallContext) {
      const { symbol, fullSymbol, args } = functionCallContext;

      // Search for matching function signature
      const signatureCurrentDoc = this.findFunctionSignatureInDocument(text, symbol, args);
      if (signatureCurrentDoc) {
        return {
          contents: {
            kind: 'markdown',
            value: signatureCurrentDoc
          }
        };
      }

      // If no exact signature match, try to find any signature info for the symbol in workspace
      const signatureResult = this.workspaceResolver.findMethodSignatureInWorkspace(symbol, fullSymbol, args);
      if (signatureResult) {
        return {
          contents: {
            kind: 'markdown',
            value: this.formatSignature(signatureResult.signature, signatureResult.groovydoc)
          }
        };
      }
    }

    // Find the word at the cursor position for keyword/symbol info
    const wordPattern = /\b\w+\b/g;
    let match;
    while ((match = wordPattern.exec(text)) !== null) {
      if (match.index <= offset && offset <= match.index + match[0].length) {
        const word = match[0];

        // Provide hover info for Groovy keywords
        const keywordInfo = this.getKeywordInfo(word);
        if (keywordInfo) {
          return {
            contents: {
              kind: 'markdown',
              value: keywordInfo
            }
          };
        }

        // Check if it's a class, method, or property
        const doc = this.groovydocParser.extractGroovydocForSymbolInText(text, word);
        if (doc) {
          return {
            contents: {
              kind: 'markdown',
              value: doc
            }
          };
        }

        const symbolInfo = this.findSymbolInfo(text, word);
        if (symbolInfo) {
          return {
            contents: {
              kind: 'markdown',
              value: symbolInfo
            }
          };
        }
      }
    }

    return null;
  }

  /**
   * Get keyword information for hover
   */
  private getKeywordInfo(keyword: string): string | null {
    const keywords: { [key: string]: string } = {
      'def': '**def** - Defines a variable or method with dynamic typing',
      'class': '**class** - Defines a class',
      'interface': '**interface** - Defines an interface',
      'extends': '**extends** - Specifies class inheritance',
      'implements': '**implements** - Specifies interface implementation',
      'import': '**import** - Imports classes or packages',
      'package': '**package** - Declares the package',
      'return': '**return** - Returns a value from a method',
      'if': '**if** - Conditional statement',
      'else': '**else** - Alternative branch of conditional',
      'for': '**for** - Loop statement',
      'while': '**while** - Loop statement',
      'switch': '**switch** - Multi-way branch statement',
      'case': '**case** - Branch in switch statement',
      'break': '**break** - Exits loop or switch',
      'continue': '**continue** - Skips to next iteration',
      'try': '**try** - Begins exception handling block',
      'catch': '**catch** - Catches exceptions',
      'finally': '**finally** - Always executed block',
      'throw': '**throw** - Throws an exception',
      'new': '**new** - Creates a new instance',
      'this': '**this** - References current object',
      'super': '**super** - References parent class',
      'static': '**static** - Defines class-level member',
      'final': '**final** - Makes variable or class immutable',
      'public': '**public** - Public access modifier',
      'private': '**private** - Private access modifier',
      'protected': '**protected** - Protected access modifier'
    };

    return keywords[keyword] || null;
  }

  /**
   * Find function signature in current document
   */
  private findFunctionSignatureInDocument(text: string, symbol: string, args: string[]): string | null {
    // Try to find method definition with matching signature
    const signature = this.findMethodSignature(text, symbol, args);
    if (signature) {
      const doc = this.groovydocParser.extractGroovydocForSymbolInText(text, symbol, args);
      return this.formatSignature(signature, doc);
    }

    return null;
  }

  /**
   * Find method signature in text
   */
  private findMethodSignature(text: string, symbol: string, args: string[]): string | null {
    const methodRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+(?:<[^>]*>)?)\\s+${symbol}\\s*\\(`, 'g');

    let match;
    while ((match = methodRegex.exec(text)) !== null) {
      // Extract the parameter list from the method definition
      const paramStart = match.index + match[0].length - 1; // Position after opening parenthesis
      const paramEnd = this.findMatchingParenthesis(text, paramStart);
      if (paramEnd !== -1) {
        const paramList = text.substring(paramStart + 1, paramEnd);
        const expectedParams = this.parseMethodParameters(paramList);

        // Check if parameter count matches (considering default parameters)
        if (this.matchesParameterCount(expectedParams, args.length)) {
          // Found a matching signature
          return text.substring(match.index, paramEnd + 1).trim();
        }
      }
    }

    return null;
  }

  /**
   * Format signature with optional documentation
   */
  private formatSignature(signature: string, doc?: string): string {
    // Clean up the signature for display
    const cleanSignature = signature.replace(/\s+/g, ' ').trim();

    let md = '';
    if (doc) {
      const cleanedDoc = doc.trim();
      md += cleanedDoc + '\n\n';
    }
    md += `\`\`\`groovy\n${cleanSignature}\n\`\`\``;
    return md;
  }

  /**
   * Find symbol information (class/method identification)
   */
  private findSymbolInfo(text: string, symbol: string): string | null {
    // Check if it's a class
    const classRegex = new RegExp(`class\\s+${symbol}\\s*(?:extends|implements|\\{)`, 'g');
    if (classRegex.test(text)) {
      return `**Class**: ${symbol}`;
    }

    // Check if it's a method
    const methodRegex = new RegExp(`(?:def|void|\\w+)\\s+${symbol}\\s*\\(`, 'g');
    if (methodRegex.test(text)) {
      return `**Method**: ${symbol}`;
    }

    return null;
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
