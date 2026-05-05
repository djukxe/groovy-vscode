import { Diagnostic, DiagnosticSeverity, Range, Position } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { ServerContext } from '../core/ServerContext';
import { countBracesAndParens } from '../utils';

/**
 * Provides syntax validation for Groovy files (braces and parentheses matching)
 */
export class ValidationProvider {
  constructor(private context: ServerContext) {}

  /**
   * Validate a text document for syntax errors
   */
  public validateTextDocument(textDocument: TextDocument): void {
    const text = textDocument.getText();
    const diagnostics: Diagnostic[] = [];

    // Basic syntax validation
    const counts = countBracesAndParens(text);

    if (counts.openBraces !== counts.closeBraces) {
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: textDocument.positionAt(0),
          end: textDocument.positionAt(text.length)
        },
        message: `Unmatched braces: ${counts.openBraces} opening, ${counts.closeBraces} closing`,
        source: 'groovy'
      };
      diagnostics.push(diagnostic);
    }

    if (counts.openParens !== counts.closeParens) {
      const diagnostic: Diagnostic = {
        severity: DiagnosticSeverity.Error,
        range: {
          start: textDocument.positionAt(0),
          end: textDocument.positionAt(text.length)
        },
        message: `Unmatched parentheses: ${counts.openParens} opening, ${counts.closeParens} closing`,
        source: 'groovy'
      };
      diagnostics.push(diagnostic);
    }

    this.context.connection.sendDiagnostics({ uri: textDocument.uri, diagnostics });
  }
}
