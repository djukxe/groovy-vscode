const path = require('path');

module.exports = {
  target: 'node',
  entry: './out/server.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'server.js',
    libraryTarget: 'commonjs2'
  },
  externals: {
    // Don't bundle Node.js built-ins
    'fs': 'commonjs fs',
    'path': 'commonjs path'
  },
  resolve: {
    extensions: ['.js']
  },
  mode: 'production'
};
