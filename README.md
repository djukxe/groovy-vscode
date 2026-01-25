# Groovy Language Server and VSCode Extension

[![Visual Studio Marketplace Version (including pre-releases)](https://img.shields.io/visual-studio-marketplace/v/JulienTAHON.groovy-vscode)](https://marketplace.visualstudio.com/items?itemName=JulienTAHON.groovy-vscode)
[![Visual Studio Marketplace Installs](https://img.shields.io/visual-studio-marketplace/i/JulienTAHON.groovy-vscode)](https://marketplace.visualstudio.com/items?itemName=JulienTAHON.groovy-vscode)
[![codecov](https://codecov.io/gh/djukxe/groovy-vscode/branch/main/graph/badge.svg)](https://codecov.io/gh/djukxe/groovy-vscode)
[![Test](https://github.com/djukxe/groovy-vscode/actions/workflows/test.yml/badge.svg?branch=main)](https://github.com/djukxe/groovy-vscode/actions/workflows/test.yml)
[![Mega-Linter](https://github.com/djukxe/groovy-vscode/actions/workflows/mega-linter.yml/badge.svg?branch=main)](https://github.com/djukxe/groovy-vscode/actions/workflows/mega-linter.yml)
[![License](https://img.shields.io/github/license/djukxe/groovy-vscode.png)](https://github.com/djukxe/groovy-vscode/blob/master/LICENSE)
[![GitHub stars](https://img.shields.io/github/stars/djukxe/groovy-vscode.png?label=Star&maxAge=2592000)](https://github.com/djukxe/groovy-vscode/stargazers/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.png?style=flat-square)](https://makeapullrequest.com)

A [Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=JulienTAHON.groovy-vscode) that provides Language Server Protocol (LSP) support for Groovy, enabling rich language features like syntax highlighting, code completion, diagnostics, and more.

## Features

- **Syntax Highlighting**: Full TextMate grammar support for Groovy syntax
- **Code Completion**: Intelligent keyword and context-aware suggestions
- **Go to Definition**: Jump to the definition of classes, methods, properties, and variables
- **Document Symbols**: Navigate classes, methods, and properties with the outline view
- **Diagnostics**: Real-time syntax validation and error detection
- **Hover Information**: Display documentation for keywords and symbols
- **Language Configuration**: Auto-closing brackets, comment toggling, and proper indentation

## Extension Settings

| Setting                               | Description                                                                                | Default |
|---------------------------------------|--------------------------------------------------------------------------------------------|---------|
| groovy.jenkins.sharedLibrary.srcPath  | Relative path to the Jenkins shared library src directory (containing classes and methods) | src     |
| groovy.jenkins.sharedLibrary.varsPath | Relative path to the Jenkins shared library vars directory (containing global functions)   | vars    |

## Supported File Extensions

- `.groovy` - Standard Groovy files
- `.gvy` - Groovy script files
- `.gy` - Groovy files
- `.gsh` - Groovy shell scripts
- `Jenkinsfile, .jenkins, .pipeline` - Jenkins scripts

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

```text
groovy-vscode
├── client
│   ├── src
│   │   └── extension.ts
│   └── syntaxes
│       ├── groovy.tmLanguage.json
│       └── jenkins-pipeline.tmLanguage.json
└── server
    └── src
        ├── server.ts
        ├── test
        │   └── languageServer.test.ts
        └── utils.ts
```

### Building

```bash
# Compile both client and server
npm run ci

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

## Future Enhancements

- Find References
- Rename refactoring

### Testing the Extension

Before publishing, test the packaged extension:

1. Install the `.vsix` file locally in VS Code:
   - Open VS Code
   - Extensions panel → `...` menu → Install from VSIX
   - Select the generated `.vsix` file

2. Test all features with `.groovy` files. Some files can be found in `groovy/`folder

## License

GPLv3

## Contributing

Contributions are welcome! Feel free to:
- Report bugs
- Suggest new features
- Submit pull requests

## Changelog

Check <https://github.com/djukxe/groovy-vscode/releases>
