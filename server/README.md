# Server Directory Structure and Relationships

This document outlines the architecture and relationships between files in the `server/` directory of the Groovy VS Code Language Server.

## Directory Structure

```
server/
├── src/
│   ├── server.ts                 # Main language server entry point
│   ├── utils.ts                  # Core utility functions (braces/parens counting)
│   ├── core/                     # Core server infrastructure
│   │   ├── ServerContext.ts      # Shared server state management
│   │   └── WorkspaceResolver.ts  # Workspace file searching and symbol resolution
│   ├── providers/                # LSP feature providers
│   │   ├── CompletionProvider.ts # Code completion
│   │   ├── DefinitionProvider.ts # Go-to-definition
│   │   ├── DocumentSymbolProvider.ts # Document symbols (outline)
│   │   ├── HoverProvider.ts      # Hover information
│   │   └── ValidationProvider.ts # Syntax validation
│   ├── utils/                    # Specialized utility classes
│   │   ├── CallContextAnalyzer.ts # Function call parsing
│   │   ├── GroovydocParser.ts    # Groovydoc comment extraction
│   │   └── ParameterParser.ts    # Method parameter analysis
│   └── test/                     # Test files
│       ├── bracesAndParens.test.ts
│       ├── languageServer.test.ts
│       └── README.md
├── package.json                  # Server package configuration
├── tsconfig.json                 # TypeScript configuration
└── build/                        # Compiled output
```

## Core Architecture

### Entry Point: `server.ts`
**Purpose**: Main language server entry point that orchestrates all LSP features.

**Relationships**:
- **Creates**: `ServerContext` instance for shared state
- **Instantiates**: All LSP providers (Validation, DocumentSymbol, Hover, Completion, Definition)
- **Registers**: LSP event handlers for each provider
- **Depends on**: All provider classes and `ServerContext`

### Shared State: `core/ServerContext.ts`
**Purpose**: Manages global server state including connection, documents, capabilities, and workspace configuration.

**Relationships**:
- **Used by**: All provider classes (passed via constructor dependency injection)
- **Provides**: Connection for logging, document access, workspace folders, Jenkins library paths
- **Initialized by**: `server.ts` during LSP initialization
- **No dependencies**: Pure state management class

## LSP Feature Providers

### `providers/ValidationProvider.ts`
**Purpose**: Provides syntax validation for Groovy files (braces and parentheses matching).

**Relationships**:
- **Depends on**: `ServerContext` (for document access)
- **Uses**: `utils.ts` `countBracesAndParens()` function
- **Called by**: `server.ts` on document changes
- **Provides**: Diagnostic information to VS Code

### `providers/DocumentSymbolProvider.ts`
**Purpose**: Provides document symbols for file outline/navigation.

**Relationships**:
- **Depends on**: `ServerContext` (for document access)
- **Called by**: `server.ts` on document symbol requests
- **Provides**: Symbol information (classes, methods, properties) to VS Code

### `providers/CompletionProvider.ts`
**Purpose**: Provides code completion suggestions.

**Relationships**:
- **Standalone**: No dependencies on other server components
- **Called by**: `server.ts` on completion requests
- **Provides**: Completion items (keywords) to VS Code

### `providers/HoverProvider.ts`
**Purpose**: Provides hover information with signatures and documentation.

**Relationships**:
- **Depends on**: `ServerContext`, `WorkspaceResolver`, `CallContextAnalyzer`, `GroovydocParser`
- **Uses**: `CallContextAnalyzer` to parse function calls at cursor
- **Uses**: `WorkspaceResolver` to find signatures in workspace files
- **Uses**: `GroovydocParser` to extract documentation from source
- **Called by**: `server.ts` on hover requests
- **Provides**: Formatted hover content (signature + groovydoc) to VS Code

### `providers/DefinitionProvider.ts`
**Purpose**: Provides go-to-definition functionality.

**Relationships**:
- **Depends on**: `ServerContext`, `WorkspaceResolver`, `CallContextAnalyzer`
- **Uses**: `CallContextAnalyzer` to parse function calls at cursor
- **Uses**: `WorkspaceResolver` to find definitions in workspace/Jenkins library files
- **Handles**: Special Jenkins shared library logic (unqualified calls → `call` method)
- **Called by**: `server.ts` on definition requests
- **Provides**: Location information to VS Code

## Workspace Resolution: `core/WorkspaceResolver.ts`
**Purpose**: Handles searching for symbols, signatures, and definitions across the workspace.

**Relationships**:
- **Depends on**: `ServerContext` (for workspace paths), `GroovydocParser`
- **Used by**: `HoverProvider`, `DefinitionProvider`
- **Searches in**: `vars/` directory (Jenkins shared library global functions)
- **Searches in**: `src/` directory (classes and methods)
- **Returns**: Signature + groovydoc information for hover
- **Returns**: Location information for go-to-definition

## Utility Classes

### `utils/CallContextAnalyzer.ts`
**Purpose**: Parses function calls at cursor positions for hover and definition features.

**Relationships**:
- **Used by**: `HoverProvider`, `DefinitionProvider`
- **Provides**: Function call context (symbol, fullSymbol, args)
- **Handles**: Complex parsing of nested function calls and method chains

### `utils/GroovydocParser.ts`
**Purpose**: Extracts and cleans Groovydoc comments from source code.

**Relationships**:
- **Used by**: `HoverProvider`, `WorkspaceResolver`
- **Provides**: Cleaned groovydoc text for display
- **Handles**: Comment delimiter stripping and formatting

### `utils/ParameterParser.ts`
**Purpose**: Analyzes method parameters and signatures for overload resolution.

**Relationships**:
- **Used by**: `WorkspaceResolver` (for signature matching)
- **Provides**: Parameter count validation and default parameter handling

### `utils.ts`
**Purpose**: Core utility functions that can be tested independently.

**Relationships**:
- **Used by**: `ValidationProvider`
- **Provides**: `countBracesAndParens()` for syntax validation
- **Note**: Kept separate from class-based utilities for independent testing

## Data Flow

### Hover Information Flow:
1. `server.ts` → `HoverProvider.getHover()`
2. `HoverProvider` → `CallContextAnalyzer.extractFunctionCallContext()`
3. `HoverProvider` → `WorkspaceResolver.findMethodSignatureInWorkspace()`
4. `WorkspaceResolver` → `GroovydocParser.extractGroovydocForSymbolInText()`
5. `HoverProvider` → Format signature + groovydoc → VS Code

### Go-to-Definition Flow:
1. `server.ts` → `DefinitionProvider.getDefinition()`
2. `DefinitionProvider` → `CallContextAnalyzer.extractFunctionCallContext()`
3. `DefinitionProvider` → `WorkspaceResolver.findDefinitionInJenkinsSharedLibrary()`
4. `WorkspaceResolver` → Search workspace files → Return location → VS Code

### Validation Flow:
1. `server.ts` → `ValidationProvider.validateTextDocument()` (on document change)
2. `ValidationProvider` → `countBracesAndParens()` from `utils.ts`
3. `ValidationProvider` → Send diagnostics → VS Code

## Jenkins Shared Library Support

The server has special handling for Jenkins shared library conventions:

- **Global functions**: Stored in `vars/` directory (e.g., `myUtils.groovy` → `myUtils()` calls)
- **Classes**: Stored in `src/` directory (e.g., `com/example/JenkinsHelper.groovy`)
- **Unqualified calls**: `myUtils()` → searches for `call` method in `myUtils.groovy`
- **Qualified calls**: `myUtils.deployTo()` → searches for `deployTo` method in `myUtils.groovy`

## Testing

- **bracesAndParens.test.ts**: Tests the core `countBracesAndParens` utility
- **languageServer.test.ts**: Tests LSP provider functionality
- Tests are located in `src/test/` and use Jest framework

## Build Configuration

- **TypeScript**: Configured via `tsconfig.json`
- **Output**: Compiled to `out/` directory
- **Package**: Managed via `package.json` with LSP dependencies</content>
<parameter name="filePath">/Users/julientahon/github/groovy-vscode/server/README.md
