# Automated Tests for Groovy Language Server

This directory contains automated tests for the Groovy language server extension.

## Test Structure

### Unit Tests (`languageServer.test.ts`)

Tests the core utility functions that power the language server:

- **Parameter Matching**: Tests for `matchesParameterCount()` function
  - Validates parameter count matching with default values
  - Tests required vs optional parameters

- **Parameter Parsing**: Tests for `parseMethodParameters()` function
  - Parses method parameter strings into arrays
  - Handles default values and complex types

- **Function Signature Finding**: Tests for `findFunctionSignature()` function
  - Finds function definitions in Groovy code
  - Handles overloaded functions correctly
  - Prefers Map signatures for map arguments

- **Method Signature Finding**: Tests for `findMethodSignature()` function
  - Finds method definitions in classes
  - Handles static and instance methods
  - Correctly matches overloaded methods

## Running Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm test -- --coverage
```

## Test Coverage

The tests cover the key functionality that was implemented:

1. **Jenkins Shared Library Support**: Finding functions in `vars/` and `src/` directories
2. **Overloaded Function Resolution**: Correctly choosing the right signature based on argument types
3. **Default Parameter Handling**: Supporting functions with optional parameters
4. **Hover Information**: Displaying correct function signatures
5. **Go to Definition**: Navigating to the correct function definitions

## Test Data

The tests use realistic Groovy code examples including:

- Jenkins pipeline syntax
- Shared library function definitions
- Class and method definitions
- Overloaded functions with different parameter types

## Adding New Tests

When adding new functionality to the language server:

1. Add unit tests for any new utility functions in `utils.ts`
2. Test edge cases and error conditions
3. Ensure test coverage for new features
4. Run the full test suite before committing

## Continuous Integration

These tests can be run in CI/CD pipelines to ensure:

- Code changes don't break existing functionality
- New features work as expected
- Refactoring doesn't introduce regressions
- The language server behaves correctly across different scenarios
