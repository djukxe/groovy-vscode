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

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

let hasConfigurationCapability = false;
let hasWorkspaceFolderCapability = false;
let workspaceFolders: WorkspaceFolder[] = [];

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
  
  // Find the word at the cursor position
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

  // Find the word at the cursor position
  const wordPattern = /\b\w+\b/g;
  let match;
  let targetWord: string | null = null;

  while ((match = wordPattern.exec(text)) !== null) {
    if (match.index <= offset && offset <= match.index + match[0].length) {
      targetWord = match[0];
      break;
    }
  }

  if (!targetWord) {
    return null;
  }

  // First, search for the definition in the current document
  let definition = findDefinitionInDocument(document, text, targetWord);
  if (definition) {
    return definition;
  }

  // If not found in current document, search in Jenkins shared library files
  definition = findDefinitionInJenkinsSharedLibrary(targetWord);
  return definition;
});

function findDefinitionInDocument(document: TextDocument, text: string, symbol: string): Location | null {
  // Try to find class definition
  const classRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:abstract|final)?\\s*(?:class|interface|enum|trait)\\s+(${symbol})\\b`, 'g');
  let match = classRegex.exec(text);
  if (match) {
    const startOffset = match.index + match[0].indexOf(symbol);
    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(startOffset + symbol.length);
    return Location.create(document.uri, Range.create(startPos, endPos));
  }
  
  // Try to find method definition
  const methodRegex = new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+)\\s+(${symbol})\\s*\\(`, 'g');
  match = methodRegex.exec(text);
  if (match) {
    const startOffset = match.index + match[0].indexOf(symbol);
    const startPos = document.positionAt(startOffset);
    const endPos = document.positionAt(startOffset + symbol.length);
    return Location.create(document.uri, Range.create(startPos, endPos));
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

function findDefinitionInJenkinsSharedLibrary(symbol: string): Location | null {
  if (workspaceFolders.length === 0) {
    return null;
  }

  // Search in vars/ directory for global functions
  for (const workspaceFolder of workspaceFolders) {
    const varsDir = path.join(workspaceFolder.uri.replace('file://', ''), 'vars');
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
    const srcDir = path.join(workspaceFolder.uri.replace('file://', ''), 'src');
    if (fs.existsSync(srcDir)) {
      const location = findClassOrMethodDefinitionInSrc(srcDir, symbol);
      if (location) {
        return location;
      }
    }
  }

  return null;
}

function findFunctionDefinitionInFile(filePath: string, content: string, symbol: string): Location | null {
  // In Jenkins shared libraries, vars files typically contain a function with the same name as the file
  // The function is usually defined as: def call(...) { ... }
  // But it can also be a direct function definition or have different signatures

  const functionPatterns = [
    // Standard function definition with def
    new RegExp(`(?:^|\\n)\\s*(?:def\\s+)?${symbol}\\s*\\(`, 'g'),
    // Function without def keyword (direct function definition)
    new RegExp(`(?:^|\\n)\\s*${symbol}\\s*\\(`, 'g')
  ];

  for (const functionRegex of functionPatterns) {
    const match = functionRegex.exec(content);
    if (match) {
      // Create a virtual document to get position
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
          if (result) return result;
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
  // Search for method definitions within classes
  // This includes both instance methods and static methods
  // Handle various method signature patterns:
  // 1. def methodName(...) - explicit def return type
  // 2. void methodName(...) - void return type
  // 3. Type methodName(...) - specific return type
  // 4. methodName(...) - no explicit return type
  // 5. Generic<Type> methodName(...) - generic return types
  // 6. Map<String, Object> methodName(...) - complex generic types

  const methodPatterns = [
    // Standard method with return type
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*(?:def|void|\\w+(?:<[^>]*>)?(?:\\s*<[^>]*>)*)\\s+${symbol}\\s*\\(`, 'g'),
    // Method without explicit return type (property-like methods)
    new RegExp(`(?:^|\\n)\\s*(?:public|private|protected)?\\s*(?:static)?\\s*${symbol}\\s*\\(`, 'g')
  ];

  for (const methodRegex of methodPatterns) {
    const match = methodRegex.exec(content);
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
