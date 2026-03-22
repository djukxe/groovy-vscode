import { Definition, DefinitionParams, Location, Range, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ServerContext } from '../core/ServerContext';
import { WorkspaceResolver } from '../core/WorkspaceResolver';
import { CallContextAnalyzer } from '../utils/CallContextAnalyzer';

/**
 * Provides go-to-definition functionality for Groovy files
 */
export class DefinitionProvider {
  private readonly callContextAnalyzer: CallContextAnalyzer;
  private readonly workspaceResolver: WorkspaceResolver;

  constructor(private context: ServerContext) {
    this.callContextAnalyzer = new CallContextAnalyzer();
    this.workspaceResolver = new WorkspaceResolver(context);
  }

  /**
   * Get definition location for the given position
   */
  public getDefinition(params: DefinitionParams): Definition | null {
    const document = this.context.documents.get(params.textDocument.uri);
    if (!document) {
      return null;
    }

    const text = document.getText();
    const offset = document.offsetAt(params.position);

    // Find the word at the cursor position and extract function call context
    const functionCallContext = this.callContextAnalyzer.extractFunctionCallContext(text, offset);
    if (!functionCallContext) {
      return null;
    }

    const { symbol, fullSymbol, args } = functionCallContext;

    // First, search for the definition in the current document
    let definition = this.findDefinitionInDocumentWithSignature(document, text, symbol, args);
    if (definition) {
      return definition;
    }

    // If not found in current document, search in Jenkins shared library files
    definition = this.workspaceResolver.findDefinitionInJenkinsSharedLibrary(symbol, fullSymbol, args);
    return definition;
  }

  /**
   * Find definition in current document with signature matching
   */
  private findDefinitionInDocumentWithSignature(document: TextDocument, text: string, symbol: string, args: string[]): Location | null {
    // Try to find class definition
    const classRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:abstract|final)?\\s*(?:class|interface|enum|trait)\\s+(${symbol})\\b`, 'g');
    let match = classRegex.exec(text);
    if (match) {
      const { line, character } = this.getSymbolPosition(match, symbol, text);
      return Location.create(document.uri, Range.create(
        Position.create(line, character),
        Position.create(line, character + symbol.length)
      ));
    }

    // Try to find method definition with matching signature
    const location = this.findMethodDefinitionWithSignature(text, symbol, args);
    if (location) {
      return Location.create(document.uri, location.range);
    }

    // Try to find property/field definition
    const propertyRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static|final)?\\s*(?:def|\\w+)\\s+(${symbol})\\s*=`, 'g');
    match = propertyRegex.exec(text);
    if (match) {
      const { line, character } = this.getSymbolPosition(match, symbol, text);
      return Location.create(document.uri, Range.create(
        Position.create(line, character),
        Position.create(line, character + symbol.length)
      ));
    }

    // Try to find variable definition (including method parameters and local variables)
    const variableRegex = new RegExp(`(?:^|\\n|\\(|,)\\s*(?:def|\\w+)?\\s+(${symbol})\\s*(?:=|,|\\)|\\n)`, 'g');
    match = variableRegex.exec(text);
    if (match) {
      const { line, character } = this.getSymbolPosition(match, symbol, text);
      return Location.create(document.uri, Range.create(
        Position.create(line, character),
        Position.create(line, character + symbol.length)
      ));
    }

    return null;
  }

  /**
   * Find method definition with signature matching
   */
  private findMethodDefinitionWithSignature(text: string, symbol: string, args: string[]): Location | null {
    const methodRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+(?:<[^>]*>)?(?:\\s*<[^>]*>)*)\\s+${symbol}\\s*\\(`, 'g');

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
          // Find the actual position of the symbol within the match string
          const { line, character } = this.getSymbolPosition(match, symbol, text);

          return Location.create(
            '', // Will be set by caller
            Range.create(
              Position.create(line, character),
              Position.create(line, character + symbol.length)
            )
          );
        }
      }
    }

    return null;
  }

  /**
   * Get symbol position from regex match
   */
  private getSymbolPosition(match: RegExpExecArray, symbol: string, text: string): { line: number, character: number } {
    const lines = text.substring(0, match.index).split('\n');
    const line = lines.length - 1;
    const lineStart = lines[line];
    const char = lineStart.length - lineStart.trimStart().length + match[0].indexOf(symbol);
    return { line, character: char };
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
