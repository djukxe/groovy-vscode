import { CompletionItem, CompletionItemKind, TextDocumentPositionParams } from 'vscode-languageserver';

/**
 * Provides code completion for Groovy files
 */
export class CompletionProvider {
  private readonly groovyKeywords = [
    'abstract', 'as', 'assert', 'break', 'case', 'catch', 'class', 'const',
    'continue', 'def', 'default', 'do', 'else', 'enum', 'extends', 'false',
    'final', 'finally', 'for', 'goto', 'if', 'implements', 'import', 'in',
    'instanceof', 'interface', 'new', 'null', 'package', 'private', 'protected',
    'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'throws',
    'trait', 'true', 'try', 'while'
  ];

  /**
   * Get completion items for the given position
   */
  public getCompletions(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] {
    return this.groovyKeywords.map(keyword => ({
      label: keyword,
      kind: CompletionItemKind.Keyword,
      data: keyword
    }));
  }

  /**
   * Resolve additional information for a completion item
   */
  public resolveCompletionItem(item: CompletionItem): CompletionItem {
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
  }
}
