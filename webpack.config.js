const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');

// TODO: add source maps so that exceptions show the right line location
// Library Configuration
const libraryConfig = {
  entry: './src/View.js',
  output: {
  filename: 'view-library.js',
  library: 'ViewLibrary',
  libraryTarget: 'umd',
  path: path.resolve(__dirname, 'dist'),
  },
  devServer: {
  static: path.join(__dirname, 'dist'),
  },
  mode: 'production',
  // ... any other library-specific webpack settings
};

// Example Configuration
const exampleConfig = {
  entry: './examples/example.js',
  output: {
    path: path.resolve(__dirname, 'examples/dist'),
    filename: 'example-bundle.js'
  },
  mode: 'development',
  devServer: {
    static: {
      directory: path.join(__dirname, 'examples/dist'),
    },
    host: '0.0.0.0', // allow access from other devices
    port: 8081,
    hot: true,
    watchFiles: ['src/**/*', 'examples/**/*'],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './examples/example.html',
      filename: 'index.html',
      inject: 'body'
    }),
    new CopyPlugin({
      patterns: [
        { from: 'examples/example.css', to: 'style.css' },
      ],
    }),
  ],
  // ... any other example-specific webpack settings
};

module.exports = (env) => {
  if (env.target === 'library') {
    return libraryConfig;
  } else if (env.target === 'example') {
    return exampleConfig;
  }
};
