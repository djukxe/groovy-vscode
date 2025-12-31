# Groovy Language Server and VSCode Extension

A Visual Studio Code extension that provides Language Server Protocol (LSP) support for Groovy, enabling rich language features like syntax highlighting, code completion, diagnostics, and more.

## Features

- **Syntax Highlighting**: Full TextMate grammar support for Groovy syntax
- **Code Completion**: Intelligent keyword and context-aware suggestions
- **Go to Definition**: Jump to the definition of classes, methods, properties, and variables
- **Document Symbols**: Navigate classes, methods, and properties with the outline view
- **Diagnostics**: Real-time syntax validation and error detection
- **Hover Information**: Display documentation for keywords and symbols
- **Language Configuration**: Auto-closing brackets, comment toggling, and proper indentation

## Supported File Extensions

- `.groovy` - Standard Groovy files
- `.gvy` - Groovy script files
- `.gy` - Groovy files
- `.gsh` - Groovy shell scripts

## Installation

### From Source

1. Clone or navigate to this repository
2. Install dependencies:
   ```bash
   npm install
   ```

3. Compile the extension:
   ```bash
   npm run compile
   ```

4. Open VSCode and press `F5` to launch the Extension Development Host

### Package as VSIX

To package the extension for distribution:

```bash
npm install -g @vscode/vsce
vsce package
```

This creates a `.vsix` file that can be installed in VSCode via:
- Extensions panel → `...` menu → Install from VSIX

## Development

### Project Structure

```
groovy-vscode-extension/
├── client/                     # VSCode extension client
│   ├── src/
│   │   └── extension.ts       # Extension entry point
│   ├── syntaxes/
│   │   └── groovy.tmLanguage.json  # TextMate grammar
│   ├── language-configuration.json
│   └── package.json
├── server/                     # Language server
│   ├── src/
│   │   └── server.ts          # LSP implementation
│   └── package.json
├── .vscode/
│   └── launch.json            # Debug configuration
└── package.json               # Root package
```

### Building

```bash
# Compile both client and server
npm run compile

# Watch mode (auto-compile on changes)
npm run watch
```

### Debugging

1. Open the project in VSCode
2. Press `F5` or select "Launch Client" from the debug panel
3. A new VSCode window (Extension Development Host) will open
4. Open or create a `.groovy` file to test the extension

To debug both client and server:
- Select "Client + Server" compound configuration
- Set breakpoints in either `client/src/extension.ts` or `server/src/server.ts`

## Language Server Features

### Implemented

- ✅ Document synchronization
- ✅ Code completion (keywords)
- ✅ Go to Definition (classes, methods, properties, variables)
- ✅ Document symbols (classes, methods, properties)
- ✅ Hover information
- ✅ Basic diagnostics (brace/parenthesis matching)
- ✅ Syntax highlighting

### Future Enhancements

- Find References
- Code formatting
- Rename refactoring
- Signature help
- Integration with Groovy compiler for advanced diagnostics
- Semantic tokens
- Code actions and quick fixes
- Cross-file Go to Definition

## Example Usage

Create a file `example.groovy`:

```groovy
class HelloWorld {
    static void main(String[] args) {
        def message = "Hello, Groovy!"
        println message
    }
    
    def greet(String name) {
        return "Hello, ${name}!"
    }
}
```

The extension will provide:
- Syntax highlighting for keywords, strings, and comments
- Autocomplete when typing keywords
- Go to Definition: Cmd+Click (Mac) or Ctrl+Click (Windows/Linux) on any symbol to jump to its definition
- Document outline showing the class and methods
- Hover information on keywords
- Error diagnostics for unmatched braces/parentheses

## Publishing to VS Code Marketplace

### Prerequisites

1. Create a Microsoft account and VS Code marketplace publisher account at https://marketplace.visualstudio.com/
2. Install VSCE (Visual Studio Code Extension) tool globally:
   ```bash
   npm install -g @vscode/vsce
   ```

3. Generate a Personal Access Token (PAT) from your Azure DevOps account with marketplace permissions

### Publishing Steps

1. **Update Repository URL**: Update the repository URL in `client/package.json` to point to your actual GitHub repository

2. **Create Extension Icon**: Create a 128x128 PNG icon at `client/icons/icon.png` and uncomment the icon line in `client/package.json`

3. **Package the Extension**:
   ```bash
   cd client
   npm run package
   ```

4. **Publish to Marketplace**:
   ```bash
   # Login to VSCE
   vsce login <publisher-name>

   # Publish
   npm run publish
   ```

   Or publish a specific version:
   ```bash
   npm run publish:patch  # For bug fixes
   npm run publish:minor  # For new features
   npm run publish:major  # For breaking changes
   ```

### Testing the Extension

Before publishing, test the packaged extension:

1. Install the `.vsix` file locally in VS Code:
   - Open VS Code
   - Extensions panel → `...` menu → Install from VSIX
   - Select the generated `.vsix` file

2. Test all features with `.groovy` files

## Requirements

- Node.js 18.0 or higher
- VSCode 1.85.0 or higher

## License

MIT

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## Changelog

### 0.1.0 (Initial Release)

- Basic language server with LSP support
- Syntax highlighting via TextMate grammar
- Code completion for Groovy keywords
- Go to Definition for classes, methods, properties, and variables
- Document symbols (outline view)
- Hover information for keywords
- Basic syntax diagnostics
- Language configuration (brackets, comments, auto-closing)
