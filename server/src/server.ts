import {
  createConnection,
  TextDocuments,
  Diagnostic,
  DiagnosticSeverity,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  CompletionItem,
  CompletionItemKind,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentSymbolParams,
  SymbolInformation,
  SymbolKind,
  Location,
  Range,
  Position,
  HoverParams,
  Hover,
  DefinitionParams,
  Definition,
  WorkspaceFolder
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import * as fs from 'fs';
import * as path from 'path';
import {
  matchesParameterCount,
  parseMethodParameters,
  findMatchingParen,
  findFunctionSignature,
  findMethodSignature
} from './utils';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let workspaceFolders: WorkspaceFolder[] = [];

// Configuration for Jenkins shared library paths
let varsPath = 'vars';
let srcPath = 'src';

connection.onInitialize((params: InitializeParams) => {
  const capabilities = params.capabilities;

  hasConfigurationCapability = !!(
    capabilities.workspace && !!capabilities.workspace.configuration
  );
  hasWorkspaceFolderCapability = !!(
    capabilities.workspace && !!capabilities.workspace.workspaceFolders
  );

  // Store workspace folders for Jenkins shared library support
  if (params.workspaceFolders) {
    workspaceFolders = params.workspaceFolders;
  }

  const result: InitializeResult = {
    capabilities: {
      textDocumentSync: TextDocumentSyncKind.Incremental,
      completionProvider: {
        resolveProvider: true,
        triggerCharacters: ['.', '@']
      },
      documentSymbolProvider: true,
      hoverProvider: true,
      definitionProvider: true
    }
  };

  if (hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }

  // Request configuration for Jenkins shared library paths
  if (hasConfigurationCapability) {
    connection.workspace.getConfiguration('groovy.jenkins.sharedLibrary').then(config => {
      if (config) {
        varsPath = config.varsPath || 'vars';
        srcPath = config.srcPath || 'src';
        connection.console.log(`Jenkins shared library paths configured: vars=${varsPath}, src=${srcPath}`);
      }
    });
  }
});

connection.onDidChangeConfiguration((change) => {
  if (hasConfigurationCapability) {
    connection.workspace.getConfiguration('groovy.jenkins.sharedLibrary').then(config => {
      if (config) {
        varsPath = config.varsPath || 'vars';
        srcPath = config.srcPath || 'src';
        connection.console.log(`Jenkins shared library paths updated: vars=${varsPath}, src=${srcPath}`);
      }
    });
  }
});

// The content of a text document has changed
documents.onDidChangeContent(change => {
  validateTextDocument(change.document);
});

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
  const text = textDocument.getText();
  const diagnostics: Diagnostic[] = [];

  // Basic syntax validation
  // Check for unmatched braces
  const openBraces = (text.match(/\{/g) || []).length;
  const closeBraces = (text.match(/\}/g) || []).length;
  
  if (openBraces !== closeBraces) {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: textDocument.positionAt(0),
        end: textDocument.positionAt(text.length)
      },
      message: `Unmatched braces: ${openBraces} opening, ${closeBraces} closing`,
      source: 'groovy'
    };
    diagnostics.push(diagnostic);
  }

  // Check for unmatched parentheses
  const openParens = (text.match(/\(/g) || []).length;
  const closeParens = (text.match(/\)/g) || []).length;
  
  if (openParens !== closeParens) {
    const diagnostic: Diagnostic = {
      severity: DiagnosticSeverity.Error,
      range: {
        start: textDocument.positionAt(0),
        end: textDocument.positionAt(text.length)
      },
      message: `Unmatched parentheses: ${openParens} opening, ${closeParens} closing`,
      source: 'groovy'
    };
    diagnostics.push(diagnostic);
  }

  connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
}

// Document symbols (outline)
connection.onDocumentSymbol((params: DocumentSymbolParams): SymbolInformation[] => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return [];
  }

  const text = document.getText();
  const symbols: SymbolInformation[] = [];

  // Match class definitions
  const classRegex = /(?:^|\n)\s*(?:public|private|protected)?\s*(?:abstract|final)?\s*class\s+(\w+)/g;
  let match;
  while ((match = classRegex.exec(text)) !== null) {
    const className = match[1];
    const position = document.positionAt(match.index);
    symbols.push({
      name: className,
      kind: SymbolKind.Class,
      location: Location.create(
        document.uri,
        Range.create(position, Position.create(position.line, position.character + className.length))
      )
    });
  }

  // Match method definitions
  const methodRegex = /(?:^|\n)\s*(?:public|private|protected)?\s*(?:static)?\s*(?:def|void|\w+)\s+(\w+)\s*\(/g;
  while ((match = methodRegex.exec(text)) !== null) {
    const methodName = match[1];
    const position = document.positionAt(match.index);
    symbols.push({
      name: methodName,
      kind: SymbolKind.Method,
      location: Location.create(
        document.uri,
        Range.create(position, Position.create(position.line, position.character + methodName.length))
      )
    });
  }

  // Match property/field definitions
  const propertyRegex = /(?:^|\n)\s*(?:public|private|protected)?\s*(?:static|final)?\s*(?:def|\w+)\s+(\w+)\s*=/g;
  while ((match = propertyRegex.exec(text)) !== null) {
    const propName = match[1];
    const position = document.positionAt(match.index);
    symbols.push({
      name: propName,
      kind: SymbolKind.Property,
      location: Location.create(
        document.uri,
        Range.create(position, Position.create(position.line, position.character + propName.length))
      )
    });
  }

  return symbols;
});

// Hover information
connection.onHover((params: HoverParams): Hover | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(params.position);

  // First, try to extract function call context for signature information
  const functionCallContext = extractFunctionCallContext(text, offset);
  if (functionCallContext) {
    const { symbol, args } = functionCallContext;

    // Search for matching function signature
    const signatureInfo = findFunctionSignatureForHover(document, text, symbol, args);
    if (signatureInfo) {
      return {
        contents: {
          kind: 'markdown',
          value: signatureInfo
        }
      };
    }

    // If no exact signature match, try Jenkins shared libraries
    const sharedLibSignature = findFunctionSignatureInJenkinsSharedLibrary(symbol, args);
    if (sharedLibSignature) {
      return {
        contents: {
          kind: 'markdown',
          value: sharedLibSignature
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
      const keywordInfo = getKeywordInfo(word);
      if (keywordInfo) {
        return {
          contents: {
            kind: 'markdown',
            value: keywordInfo
          }
        };
      }

      // Check if it's a class, method, or property
      const symbolInfo = findSymbolInfo(text, word);
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
});

function getKeywordInfo(keyword: string): string | null {
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

function findFunctionSignatureForHover(document: TextDocument, text: string, symbol: string, args: string[]): string | null {
  // Try to find method definition with matching signature
  const signature = findMethodSignature(text, symbol, args);
  if (signature) {
    return formatSignature(symbol, signature);
  }

  return null;
}

function findFunctionSignatureInJenkinsSharedLibrary(symbol: string, args: string[]): string | null {
  if (workspaceFolders.length === 0) {
    return null;
  }

  // Search in vars/ directory for global functions
  for (const workspaceFolder of workspaceFolders) {
    const varsDir = path.join(workspaceFolder.uri.replace('file://', ''), varsPath);
    if (fs.existsSync(varsDir)) {
      try {
        const files = fs.readdirSync(varsDir);
        for (const file of files) {
          if (file.endsWith('.groovy')) {
            const filePath = path.join(varsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // In Jenkins shared libraries, vars files can be called by their filename
            const fileNameWithoutExt = file.replace('.groovy', '');
            if (fileNameWithoutExt === symbol) {
              // If the symbol matches the filename, look for the 'call' function with matching signature
              const signature = findFunctionSignature(content, 'call', args);
              if (signature) {
                return formatSignature(`${fileNameWithoutExt}.call`, signature);
              }
            } else {
              // Otherwise, look for a function with the exact symbol name and matching signature
              const signature = findFunctionSignature(content, symbol, args);
              if (signature) {
                return formatSignature(symbol, signature);
              }
            }
          }
        }
      } catch (error) {
        // Ignore errors reading vars directory
      }
    }

    // Search in src/ directory for classes and their methods
    const srcDir = path.join(workspaceFolder.uri.replace('file://', ''), srcPath);
    if (fs.existsSync(srcDir)) {
      const signature = findMethodSignatureInSrc(srcDir, symbol, args);
      if (signature) {
        return formatSignature(symbol, signature);
      }
    }
  }

  return null;
}

function findMethodSignatureInSrc(srcDir: string, symbol: string, args: string[]): string | null {
  // Recursively search for method signature in src directory
  function searchDirectory(dir: string): string | null {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          const result = searchDirectory(itemPath);
          if (result) {
            return result
          };
        } else if (item.endsWith('.groovy')) {
          const content = fs.readFileSync(itemPath, 'utf8');
          const signature = findMethodSignature(content, symbol, args);
          if (signature) {
            return signature;
          }
        }
      }
    } catch (error) {
      // Ignore errors reading directory
    }
    return null;
  }

  return searchDirectory(srcDir);
}

function formatSignature(symbol: string, signature: string): string {
  // Clean up the signature for display
  const cleanSignature = signature.replace(/\s+/g, ' ').trim();

  return `\`\`\`groovy\n${cleanSignature}\n\`\`\``;
}

function findSymbolInfo(text: string, symbol: string): string | null {
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

// Code completion
connection.onCompletion(
  (_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
    const groovyKeywords = [
      'abstract', 'as', 'assert', 'break', 'case', 'catch', 'class', 'const',
      'continue', 'def', 'default', 'do', 'else', 'enum', 'extends', 'false',
      'final', 'finally', 'for', 'goto', 'if', 'implements', 'import', 'in',
      'instanceof', 'interface', 'new', 'null', 'package', 'private', 'protected',
      'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'throws',
      'trait', 'true', 'try', 'while'
    ];

    return groovyKeywords.map(keyword => ({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      data: keyword
    }));
  }
);

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  const keywordDescriptions: { [key: string]: string } = {
    'def': 'Defines a variable or method with dynamic typing',
    'class': 'Defines a class',
    'interface': 'Defines an interface',
    'trait': 'Defines a trait (mixin)',
    'return': 'Returns a value from a method',
    'if': 'Conditional statement',
    'for': 'Loop statement',
    'while': 'Loop statement',
    'switch': 'Multi-way branch statement',
    'try': 'Exception handling block'
  };

  if (item.data && keywordDescriptions[item.data]) {
    item.detail = keywordDescriptions[item.data];
    item.documentation = keywordDescriptions[item.data];
  }

  return item;
});

// Go to Definition
connection.onDefinition((params: DefinitionParams): Definition | null => {
  const document = documents.get(params.textDocument.uri);
  if (!document) {
    return null;
  }

  const text = document.getText();
  const offset = document.offsetAt(params.position);

  // Find the word at the cursor position and extract function call context
  const functionCallContext = extractFunctionCallContext(text, offset);
  if (!functionCallContext) {
    return null;
  }

  const { symbol, args } = functionCallContext;

  // First, search for the definition in the current document
  let definition = findDefinitionInDocumentWithSignature(document, text, symbol, args);
  if (definition) {
    return definition;
  }

  // If not found in current document, search in Jenkins shared library files
  definition = findDefinitionInJenkinsSharedLibraryWithSignature(symbol, args);
  return definition;
});

function extractFunctionCallContext(text: string, offset: number): { symbol: string, args: string[] } | null {
  // Find the function call that contains the offset
  // Look for patterns like: symbol(args) or obj.symbol(args)

  // First, try to find a function call ending at or after the offset
  const functionCallPattern = /(\w+(?:\.\w+)*)\s*\(([^)]*)\)/g;
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
      const args = parseArguments(argsString);

      return { symbol, args };
    }
  }

  return null;
}

function parseArguments(argsString: string): string[] {
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

function findDefinitionInDocumentWithSignature(document: TextDocument, text: string, symbol: string, args: string[]): Location | null {
  // Try to find class definition
  const classRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:abstract|final)?\\s*(?:class|interface|enum|trait)\\s+(${symbol})\\b`, 'g');
  let match = classRegex.exec(text);
  if (match) {
    const startOffset = match.index + match[0].indexOf(symbol);
    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(startOffset + symbol.length);
    return Location.create(document.uri, Range.create(startPos, endPos));
  }

  // Try to find method definition with matching signature
  const location = findMethodDefinitionWithSignature(text, symbol, args);
  if (location) {
    return Location.create(document.uri, location.range);
  }

  // Try to find property/field definition
  const propertyRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static|final)?\\s*(?:def|\\w+)\\s+(${symbol})\\s*=`, 'g');
  match = propertyRegex.exec(text);
  if (match) {
    const startOffset = match.index + match[0].indexOf(symbol);
    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(startOffset + symbol.length);
    return Location.create(document.uri, Range.create(startPos, endPos));
  }

  // Try to find variable definition (including method parameters and local variables)
  const variableRegex = new RegExp(`(?:^|\\n|\\(|,)\\s*(?:def|\\w+)?\\s+(${symbol})\\s*(?:=|,|\\)|\\n)`, 'g');
  match = variableRegex.exec(text);
  if (match) {
    const startOffset = match.index + match[0].indexOf(symbol);
    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(startOffset + symbol.length);
    return Location.create(document.uri, Range.create(startPos, endPos));
  }

  return null;
}

function findMethodDefinitionWithSignature(text: string, symbol: string, args: string[]): Location | null {
  const methodPatterns = [
    // Standard method with return type
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+(?:<[^>]*>)?(?:\\s*<[^>]*>)*)\\s+${symbol}\\s*\\(`, 'g'),
    // Method without explicit return type (property-like methods)
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*${symbol}\\s*\\(`, 'g')
  ];

  for (const methodRegex of methodPatterns) {
    let match;
    while ((match = methodRegex.exec(text)) !== null) {
      // Extract the parameter list from the method definition
      const paramStart = match.index + match[0].length - 1; // Position after opening parenthesis
      const paramEnd = findMatchingParen(text, paramStart);
      if (paramEnd !== -1) {
        const paramList = text.substring(paramStart + 1, paramEnd);
        const expectedParams = parseMethodParameters(paramList);

        // Check if parameter count matches (considering default parameters)
        if (matchesParameterCount(expectedParams, args.length)) {
          // Found a matching signature
          const lines = text.substring(0, match.index).split('\n');
          const line = lines.length - 1;
          const character = lines[lines.length - 1].length;
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
  }

  return null;
}





function findDefinitionInJenkinsSharedLibrary(symbol: string): Location | null {
  if (workspaceFolders.length === 0) {
    return null;
  }

  // Search in vars/ directory for global functions
  for (const workspaceFolder of workspaceFolders) {
    const varsDir = path.join(workspaceFolder.uri.replace('file://', ''), varsPath);
    if (fs.existsSync(varsDir)) {
      connection.console.log(`Searching for function ${symbol} in vars directory: ${varsDir}`);
      try {
        const files = fs.readdirSync(varsDir);
        for (const file of files) {
          if (file.endsWith('.groovy')) {
            const filePath = path.join(varsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // In Jenkins shared libraries, vars files can be called by their filename
            // e.g., myUtils() calls the 'call' function in myUtils.groovy
            const fileNameWithoutExt = file.replace('.groovy', '');
            if (fileNameWithoutExt === symbol) {
              // If the symbol matches the filename, look for the 'call' function
              const location = findFunctionDefinitionInFile(filePath, content, 'call');
              if (location) {
                return location;
              }
            } else {
              // Otherwise, look for a function with the exact symbol name
              const location = findFunctionDefinitionInFile(filePath, content, symbol);
              if (location) {
                return location;
              }
            }
          }
        }
      } catch (error) {
        // Ignore errors reading vars directory
      }
    }

    // Search in src/ directory for classes and their methods
    const srcDir = path.join(workspaceFolder.uri.replace('file://', ''), srcPath);
    if (fs.existsSync(srcDir)) {
      const location = findClassOrMethodDefinitionInSrc(srcDir, symbol);
      if (location) {
        return location;
      }
    }
  }

  return null;
}

function findDefinitionInJenkinsSharedLibraryWithSignature(symbol: string, args: string[]): Location | null {
  if (workspaceFolders.length === 0) {
    return null;
  }

  // Search in vars/ directory for global functions
  for (const workspaceFolder of workspaceFolders) {
    const varsDir = path.join(workspaceFolder.uri.replace('file://', ''), varsPath);
    if (fs.existsSync(varsDir)) {
      connection.console.log(`Searching for function ${symbol} with ${args.length} args in vars directory: ${varsDir}`);
      try {
        const files = fs.readdirSync(varsDir);
        for (const file of files) {
          if (file.endsWith('.groovy')) {
            const filePath = path.join(varsDir, file);
            const content = fs.readFileSync(filePath, 'utf8');

            // In Jenkins shared libraries, vars files can be called by their filename
            // e.g., myUtils() calls the 'call' function in myUtils.groovy
            const fileNameWithoutExt = file.replace('.groovy', '');
            if (fileNameWithoutExt === symbol) {
              // If the symbol matches the filename, look for the 'call' function with matching signature
              const location = findFunctionDefinitionWithSignature(filePath, content, 'call', args);
              if (location) {
                return location;
              }
            } else {
              // Otherwise, look for a function with the exact symbol name and matching signature
              const location = findFunctionDefinitionWithSignature(filePath, content, symbol, args);
              if (location) {
                return location;
              }
            }
          }
        }
      } catch (error) {
        // Ignore errors reading vars directory
      }
    }

    // Search in src/ directory for classes and their methods
    const srcDir = path.join(workspaceFolder.uri.replace('file://', ''), srcPath);
    if (fs.existsSync(srcDir)) {
      connection.console.log(`Searching for class or method ${symbol} with ${args.length} args in src directory: ${srcDir}`);
      const location = findClassOrMethodDefinitionInSrcWithSignature(srcDir, symbol, args);
      if (location) {
        connection.console.log(`Found location: ${location}`);
        return location;
      }
    }
  }

  return null;
}

function findFunctionDefinitionWithSignature(filePath: string, content: string, symbol: string, args: string[]): Location | null {
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
      const paramEnd = findMatchingParen(content, paramStart);
      if (paramEnd !== -1) {
        const paramList = content.substring(paramStart + 1, paramEnd);
        const expectedParams = parseMethodParameters(paramList);

        // Check if parameter count matches (considering default parameters)
        if (matchesParameterCount(expectedParams, args.length)) {
          // Found a matching signature
          const lines = content.substring(0, match.index).split('\n');
          const line = lines.length - 1;
          const character = lines[lines.length - 1].length;
          return Location.create(
            `file://${filePath}`,
            Range.create(
              Position.create(line, character),
              Position.create(line, character + symbol.length)
            )
          );
        }
      }
    }
  }

  return null;
}

function findClassOrMethodDefinitionInSrcWithSignature(srcDir: string, symbol: string, args: string[]): Location | null {
  // Recursively search for class or method definition in src directory
  function searchDirectory(dir: string): Location | null {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          const result = searchDirectory(itemPath);
          if (result) {
            return result
          };
        } else if (item.endsWith('.groovy')) {
          const content = fs.readFileSync(itemPath, 'utf8');
          // First try to find class definition
          let location = findClassDefinitionInFile(itemPath, content, symbol);
          if (location) {
            return location;
          }
          // Then try to find method definition with matching signature
          location = findMethodDefinitionWithSignature(content, symbol, args);
          if (location) {
            return Location.create(`file://${itemPath}`, location.range);
          }
        }
      }
    } catch (error) {
      // Ignore errors reading directory
    }
    return null;
  }

  return searchDirectory(srcDir);
}

function findFunctionDefinitionInFile(filePath: string, content: string, symbol: string): Location | null {
  // For overloaded functions, find the first occurrence of the function name
  // This ensures we jump to where the function is defined, showing all overloads

  const functionPatterns = [
    // Standard function definition with def
    new RegExp(`(?:^|\\n)\\s*(?:def\\s+)?${symbol}\\s*\\(`, 'g'),
    // Function without def keyword (direct function definition)
    new RegExp(`(?:^|\\n)\\s*${symbol}\\s*\\(`, 'g')
  ];

  let firstMatch: RegExpExecArray | null = null;
  let earliestPosition = Infinity;

  for (const functionRegex of functionPatterns) {
    let match;
    while ((match = functionRegex.exec(content)) !== null) {
      if (match.index < earliestPosition) {
        earliestPosition = match.index;
        firstMatch = match;
      }
    }
  }

  if (firstMatch) {
    const lines = content.substring(0, firstMatch.index).split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return Location.create(
      `file://${filePath}`,
      Range.create(
        Position.create(line, character),
        Position.create(line, character + symbol.length)
      )
    );
  }

  return null;
}

function findClassOrMethodDefinitionInSrc(srcDir: string, symbol: string): Location | null {
  // Recursively search for class or method definition in src directory
  function searchDirectory(dir: string): Location | null {
    try {
      const items = fs.readdirSync(dir);
      for (const item of items) {
        const itemPath = path.join(dir, item);
        const stat = fs.statSync(itemPath);

        if (stat.isDirectory()) {
          const result = searchDirectory(itemPath);
          if (result) {
            return result
          };
        } else if (item.endsWith('.groovy')) {
          const content = fs.readFileSync(itemPath, 'utf8');
          // First try to find class definition
          let location = findClassDefinitionInFile(itemPath, content, symbol);
          if (location) {
            return location;
          }
          // Then try to find method definition within the class
          location = findMethodDefinitionInFile(itemPath, content, symbol);
          if (location) {
            return location;
          }
        }
      }
    } catch (error) {
      // Ignore errors reading directory
    }
    return null;
  }

  return searchDirectory(srcDir);
}

function findMethodDefinitionInFile(filePath: string, content: string, symbol: string): Location | null {
  // For overloaded methods, find the first occurrence of the method name
  // This ensures we jump to where the method is defined, showing all overloads

  const methodPatterns = [
    // Standard method with return type
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+(?:<[^>]*>)?(?:\\s*<[^>]*>)*)\\s+${symbol}\\s*\\(`, 'g'),
    // Method without explicit return type (property-like methods)
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*${symbol}\\s*\\(`, 'g')
  ];

  let firstMatch: RegExpExecArray | null = null;
  let earliestPosition = Infinity;

  for (const methodRegex of methodPatterns) {
    let match;
    while ((match = methodRegex.exec(content)) !== null) {
      if (match.index < earliestPosition) {
        earliestPosition = match.index;
        firstMatch = match;
      }
    }
  }

  if (firstMatch) {
    const lines = content.substring(0, firstMatch.index).split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return Location.create(
      `file://${filePath}`,
      Range.create(
        Position.create(line, character),
        Position.create(line, character + symbol.length)
      )
    );
  }

  return null;
}

function findClassDefinitionInFile(filePath: string, content: string, symbol: string): Location | null {
  const classRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:abstract|final)?\\s*(?:class|interface|enum|trait)\\s+${symbol}\\b`, 'g');
  const match = classRegex.exec(content);
  if (match) {
    const lines = content.substring(0, match.index).split('\n');
    const line = lines.length - 1;
    const character = lines[lines.length - 1].length;
    return Location.create(
      `file://${filePath}`,
      Range.create(
        Position.create(line, character),
        Position.create(line, character + symbol.length)
      )
    );
  }
  return null;
}
documents.listen(connection);

// Listen on the connection
connection.listen();
