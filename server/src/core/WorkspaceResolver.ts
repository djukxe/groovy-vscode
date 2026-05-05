import * as fs from 'fs';
import * as path from 'path';
import { Location, Range, Position } from 'vscode-languageserver';
import { ServerContext } from './ServerContext';
import { GroovydocParser } from '../utils/GroovydocParser';

interface SignatureResult {
  signature: string;
  groovydoc?: string;
}

/**
 * Consolidates workspace searching logic for finding symbols and method signatures
 */
export class WorkspaceResolver {
  private groovydocParser: GroovydocParser;

  constructor(private context: ServerContext) {
    this.groovydocParser = new GroovydocParser();
  }

  /**
   * Find method signature in workspace for hover information
   */
  public findMethodSignatureInWorkspace(symbol: string, fullSymbol: string, args: string[]): SignatureResult | null {
    if (this.context.workspaceFolders.length === 0) {
      return null;
    }

    for (const workspaceFolder of this.context.workspaceFolders) {
      // Search in src/ directory for classes and their methods
      const srcDir = path.join(workspaceFolder.uri.replace('file://', ''), this.context.srcPath);
      if (fs.existsSync(srcDir)) {
        const result = this.findMethodSignatureInSrc(srcDir, symbol, args);
        if (result) {
          return result;
        }
      }

      // Search in vars/ directory for global functions (Jenkins shared library)
      const varsDir = path.join(workspaceFolder.uri.replace('file://', ''), this.context.varsPath);
      if (fs.existsSync(varsDir)) {
        try {
          const files = fs.readdirSync(varsDir);

          // If fullSymbol contains a dot, it's a qualified call like myUtils.deployTo()
          // Extract the object/namespace part and prioritize that file
          const symbolParts = fullSymbol.split('.');
          const objectName = symbolParts.length > 1 ? symbolParts[0] : null;

          // First pass: if it's a qualified call, look in the specific file
          if (objectName) {
            const targetFile = `${objectName}.groovy`;
            const targetFilePath = path.join(varsDir, targetFile);
            if (fs.existsSync(targetFilePath)) {
              const content = fs.readFileSync(targetFilePath, 'utf8');
              const result = this.findFunctionSignatureInFile(content, symbol, args);
              if (result) {
                return result;
              }
            }
          }

          // Second pass: search all files (for unqualified calls or as fallback)
          for (const file of files) {
            if (file.endsWith('.groovy')) {
              const filePath = path.join(varsDir, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const result = this.findFunctionSignatureInFile(content, symbol, args);
              if (result) {
                return result;
              }
            }
          }
        } catch (error) {
          this.context.connection.console.log(`Error reading vars directory: ${error}`);
        }
      }
    }

    return null;
  }

  /**
   * Find method definition location in workspace for go-to-definition
   */
  public findDefinitionInJenkinsSharedLibrary(symbol: string, fullSymbol: string, args: string[]): Location | null {
    if (this.context.workspaceFolders.length === 0) {
      return null;
    }

    // Search in vars/ directory for global functions
    for (const workspaceFolder of this.context.workspaceFolders) {
      const varsDir = path.join(workspaceFolder.uri.replace('file://', ''), this.context.varsPath);
      if (fs.existsSync(varsDir)) {
        this.context.connection.console.log(`Searching for function ${symbol} with ${args.length} args in vars directory: ${varsDir}`);
        try {
          const files = fs.readdirSync(varsDir);

          // If fullSymbol contains a dot, it's a qualified call like myUtils.deployTo()
          // Extract the object/namespace part and prioritize that file
          const symbolParts = fullSymbol.split('.');
          const objectName = symbolParts.length > 1 ? symbolParts[0] : null;

          // First pass: if it's a qualified call, look in the specific file
          if (objectName) {
            const targetFile = `${objectName}.groovy`;
            const targetFilePath = path.join(varsDir, targetFile);
            if (fs.existsSync(targetFilePath)) {
              const content = fs.readFileSync(targetFilePath, 'utf8');
              const location = this.findFunctionDefinitionInFile(targetFilePath, content, symbol, args);
              if (location) {
                return location;
              }
            }
          }

          // Second pass: search all files (for unqualified calls or as fallback)
          for (const file of files) {
            if (file.endsWith('.groovy')) {
              const filePath = path.join(varsDir, file);
              const content = fs.readFileSync(filePath, 'utf8');
              const location = this.findFunctionDefinitionInFile(filePath, content, symbol, args);
              if (location) {
                return location;
              }
            }
          }
        } catch (error) {
          this.context.connection.console.log(`Error reading vars directory: ${error}`);
        }
      }

      // Search in src/ directory for classes and their methods
      const srcDir = path.join(workspaceFolder.uri.replace('file://', ''), this.context.srcPath);
      if (fs.existsSync(srcDir)) {
        this.context.connection.console.log(`Searching for class or method ${symbol} with ${args.length} args in src directory: ${srcDir}`);
        const location = this.findClassOrMethodDefinitionInSrc(srcDir, symbol, args);
        if (location) {
          return location;
        }
      }
    }

    return null;
  }

  /**
   * Find method signature in src directory
   */
  private findMethodSignatureInSrc(srcDir: string, symbol: string, args: string[]): SignatureResult | null {
    const self = this;
    function searchDirectory(dir: string): SignatureResult | null {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            const result = searchDirectory(itemPath);
            if (result) {
              return result;
            }
          } else if (item.endsWith('.groovy')) {
            const content = fs.readFileSync(itemPath, 'utf8');
            const result = self.findFunctionSignatureInFile(content, symbol, args);
            if (result) {
              return result;
            }
          }
        }
      } catch (error) {
        self.context.connection.console.log(`Error reading src directory: ${error}`);
      }
      return null;
    }

    return searchDirectory(srcDir);
  }

  /**
   * Find function signature in a single file
   */
  private findFunctionSignatureInFile(content: string, symbol: string, args: string[]): SignatureResult | null {
    const functionPatterns = [
      // Standard function definition with def
      new RegExp(`(?:^|\\n)\\s*(?:def\\s+)?${symbol}\\s*\\(`, 'g'),
      // Function without def keyword (direct function definition)
      new RegExp(`(?:^|\\n)\\s*${symbol}\\s*\\(`, 'g')
    ];

    for (const functionRegex of functionPatterns) {
      let match;
      while ((match = functionRegex.exec(content)) !== null) {
        // Extract the parameter list from the function definition
        const paramStart = match.index + match[0].length - 1; // Position after opening parenthesis
        const paramEnd = this.findMatchingParenthesis(content, paramStart);
        if (paramEnd !== -1) {
          const paramList = content.substring(paramStart + 1, paramEnd);
          const expectedParams = this.parseMethodParameters(paramList);

          // Check if parameter count matches (considering default parameters)
          if (this.matchesParameterCount(expectedParams, args.length)) {
            // Found a matching signature
            const signature = content.substring(match.index, paramEnd + 1).trim();
            
            // Extract groovydoc for this symbol
            const groovydoc = this.groovydocParser.extractGroovydocForSymbolInText(content, symbol, args);
            
            return { signature, groovydoc };
          }
        }
      }
    }

    return null;
  }

  /**
   * Find function definition location in a single file
   */
  private findFunctionDefinitionInFile(filePath: string, content: string, symbol: string, args: string[]): Location | null {
    const functionPatterns = [
      // Standard function definition with def
      new RegExp(`(?:^|\\n)\\s*(?:def\\s+)?${symbol}\\s*\\(`, 'g'),
      // Function without def keyword (direct function definition)
      new RegExp(`(?:^|\\n)\\s*${symbol}\\s*\\(`, 'g')
    ];

    for (const functionRegex of functionPatterns) {
      let match;
      while ((match = functionRegex.exec(content)) !== null) {
        // Extract the parameter list from the function definition
        const paramStart = match.index + match[0].length - 1; // Position after opening parenthesis
        const paramEnd = this.findMatchingParenthesis(content, paramStart);
        if (paramEnd !== -1) {
          const paramList = content.substring(paramStart + 1, paramEnd);
          const expectedParams = this.parseMethodParameters(paramList);

          // Check if parameter count matches (considering default parameters)
          if (this.matchesParameterCount(expectedParams, args.length)) {
            // Found a matching signature
            // Find the actual position of the symbol within the match string
            const lines = content.substring(0, match.index).split('\n');
            const line = lines.length - 1;
            const lineStart = lines[line];
            const char = lineStart.length - lineStart.trimStart().length + match[0].indexOf(symbol);

            return Location.create(
              `file://${filePath}`,
              Range.create(
                Position.create(line, char),
                Position.create(line, char + symbol.length)
              )
            );
          }
        }
      }
    }

    return null;
  }

  /**
   * Find class or method definition in src directory recursively
   */
  private findClassOrMethodDefinitionInSrc(srcDir: string, symbol: string, args: string[]): Location | null {
    const self = this;
    function searchDirectory(dir: string): Location | null {
      try {
        const items = fs.readdirSync(dir);
        for (const item of items) {
          const itemPath = path.join(dir, item);
          const stat = fs.statSync(itemPath);

          if (stat.isDirectory()) {
            const result = searchDirectory(itemPath);
            if (result) {
              return result;
            }
          } else if (item.endsWith('.groovy')) {
            const content = fs.readFileSync(itemPath, 'utf8');

            // Try to find class definition first
            const classLocation = self.findClassDefinitionInFile(itemPath, content, symbol);
            if (classLocation) {
              return classLocation;
            }

            // Try to find method definition
            const methodLocation = self.findFunctionDefinitionInFile(itemPath, content, symbol, args);
            if (methodLocation) {
              return methodLocation;
            }
          }
        }
      } catch (error) {
        self.context.connection.console.log(`Error reading directory: ${error}`);
      }
      return null;
    }

    return searchDirectory(srcDir);
  }

  /**
   * Find class definition in a single file
   */
  private findClassDefinitionInFile(filePath: string, content: string, symbol: string): Location | null {
    const classRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:abstract|final)?\\s*(?:class|interface|enum|trait)\\s+${symbol}\\b`, 'g');
    const match = classRegex.exec(content);
    if (match) {
      const lines = content.substring(0, match.index).split('\n');
      const line = lines.length - 1;
      const lineStart = lines[line];
      const char = lineStart.length - lineStart.trimStart().length + match[0].indexOf(symbol);

      return Location.create(
        `file://${filePath}`,
        Range.create(
          Position.create(line, char),
          Position.create(line, char + symbol.length)
        )
      );
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
