import { Connection, TextDocuments, InitializeParams, WorkspaceFolder } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';

/**
 * Manages shared state for the language server
 */
export class ServerContext {
  public readonly connection: Connection;
  public readonly documents: TextDocuments<TextDocument>;

  public hasConfigurationCapability: boolean = false;
  public hasWorkspaceFolderCapability: boolean = false;
  public workspaceFolders: WorkspaceFolder[] = [];

  // Configuration for Jenkins shared library paths
  public varsPath: string = 'vars';
  public srcPath: string = 'src';

  constructor(connection: Connection, documents: TextDocuments<TextDocument>) {
    this.connection = connection;
    this.documents = documents;
  }

  /**
   * Initialize capabilities and workspace folders from InitializeParams
   */
  public initialize(params: InitializeParams): void {
    const capabilities = params.capabilities;

    this.hasConfigurationCapability = !!(
      capabilities.workspace && !!capabilities.workspace.configuration
    );
    this.hasWorkspaceFolderCapability = !!(
      capabilities.workspace && !!capabilities.workspace.workspaceFolders
    );

    // Store workspace folders for Jenkins shared library support
    if (params.workspaceFolders) {
      this.workspaceFolders = params.workspaceFolders;
    }
  }

  /**
   * Update configuration paths from workspace settings
   */
  public updateConfiguration(config: any): void {
    if (config) {
      this.varsPath = config.varsPath || 'vars';
      this.srcPath = config.srcPath || 'src';
      this.connection.console.log(`Jenkins shared library paths updated: vars=${this.varsPath}, src=${this.srcPath}`);
    }
  }
}
