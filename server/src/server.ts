import {
  createConnection,
  TextDocuments,
  ProposedFeatures,
  InitializeParams,
  DidChangeConfigurationNotification,
  TextDocumentPositionParams,
  TextDocumentSyncKind,
  InitializeResult,
  DocumentSymbolParams,
  SymbolInformation,
  HoverParams,
  Hover,
  DefinitionParams,
  Definition,
  CompletionItem
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { ServerContext } from './core/ServerContext';
import { ValidationProvider } from './providers/ValidationProvider';
import { DocumentSymbolProvider } from './providers/DocumentSymbolProvider';
import { HoverProvider } from './providers/HoverProvider';
import { CompletionProvider } from './providers/CompletionProvider';
import { DefinitionProvider } from './providers/DefinitionProvider';

// Create a connection for the server
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager
const documents: TextDocuments<TextDocument> = new TextDocuments(TextDocument);

// Create server context to manage shared state
const serverContext = new ServerContext(connection, documents);

// Create LSP providers
const validationProvider = new ValidationProvider(serverContext);
const documentSymbolProvider = new DocumentSymbolProvider(serverContext);
const hoverProvider = new HoverProvider(serverContext);
const completionProvider = new CompletionProvider();
const definitionProvider = new DefinitionProvider(serverContext);

connection.onInitialize((params: InitializeParams) => {
  // Initialize server context with capabilities and workspace folders
  serverContext.initialize(params);

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

  if (serverContext.hasWorkspaceFolderCapability) {
    result.capabilities.workspace = {
      workspaceFolders: {
        supported: true
      }
    };
  }

  return result;
});

connection.onInitialized(() => {
  if (serverContext.hasConfigurationCapability) {
    connection.client.register(DidChangeConfigurationNotification.type, undefined);
  }

  // Request configuration for Jenkins shared library paths
  if (serverContext.hasConfigurationCapability) {
    connection.workspace.getConfiguration('groovy.jenkins.sharedLibrary').then(config => {
      serverContext.updateConfiguration(config);
    });
  }
});

connection.onDidChangeConfiguration((change) => {
  connection.console.log(`Configuration changed, reloading settings...${JSON.stringify(change, null, 2)}`);
  if (serverContext.hasConfigurationCapability) {
    connection.workspace.getConfiguration('groovy.jenkins.sharedLibrary').then(config => {
      serverContext.updateConfiguration(config);
    });
  }
});

// The content of a text document has changed
documents.onDidChangeContent(change => {
  validationProvider.validateTextDocument(change.document);
});

// Document symbols (outline)
connection.onDocumentSymbol((params: DocumentSymbolParams): SymbolInformation[] => {
  return documentSymbolProvider.getDocumentSymbols(params);
});

// Hover information
connection.onHover((params: HoverParams): Hover | null => {
  return hoverProvider.getHover(params);
});

// Code completion
connection.onCompletion(
  (params: TextDocumentPositionParams): CompletionItem[] => {
    return completionProvider.getCompletions(params);
  }
);

connection.onCompletionResolve((item: CompletionItem): CompletionItem => {
  return completionProvider.resolveCompletionItem(item);
});

// Go to Definition
connection.onDefinition((params: DefinitionParams): Definition | null => {
  return definitionProvider.getDefinition(params);
});

documents.listen(connection);

// Listen on the connection
connection.listen();
