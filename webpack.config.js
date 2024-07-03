const path = require('path');
const webpack = require('webpack');
const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = {
  entry: {
    global: './src/global.js',
    popup: ['./src/global.js', './src/popup.js'],
    content: ['./src/global.js', './src/content.js'],
    background: ['./src/global.js', './src/background.js'],
    options: ['./src/global.js', './src/options.js']
  },
  output: {
    filename: '[name].js',
    path: path.resolve(__dirname, 'dist'),
  },
  mode: 'production',
  target: 'web',
  devtool: 'source-map',
  resolve: {
    fallback: {
      "fs": false,
      "path": require.resolve("path-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "http": require.resolve("stream-http"),
      "https": require.resolve("https-browserify"),
      "url": require.resolve("url/"),
      "stream": require.resolve("stream-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "buffer": require.resolve("buffer/"),
      "util": require.resolve("util/"),
      "assert": require.resolve("assert/"),
      "process": require.resolve("process/browser"),
    },
    alias: {
      "process": "process/browser"
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: 'process/browser',
      Buffer: ['buffer', 'Buffer'],
    }),
    new NodePolyfillPlugin(),
    new webpack.NormalModuleReplacementPlugin(
      /node:fs\/promises/,
      'memfs'
    )
  ],
  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false
        }
      }
    ]
  }
};