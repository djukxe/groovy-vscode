import { SymbolInformation, SymbolKind, Location, Range, Position, DocumentSymbolParams } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ServerContext } from '../core/ServerContext';

/**
 * Provides document symbols (outline) for Groovy files
 */
export class DocumentSymbolProvider {
  constructor(private context: ServerContext) {}

  /**
   * Get document symbols for the given text document
   */
  public getDocumentSymbols(params: DocumentSymbolParams): SymbolInformation[] {
    const document = this.context.documents.get(params.textDocument.uri);
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
  }
}
