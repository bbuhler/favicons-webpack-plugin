'use strict';
var childCompiler = require('./lib/compiler.js');
var assert = require('assert');
var fs = require('fs');
var path = require('path');

function FaviconsWebpackPlugin (options) {
  if (typeof options === 'string') {
    options = {logo: options};
  }
  assert(typeof options === 'object', 'FaviconsWebpackPlugin options are required');
  assert(options.logo, 'An input file is required');
  this.options = Object.assign({
    prefix: 'icons-[hash]/',
    emitStats: false,
    statsFilename: 'iconstats-[hash].json',
    persistentCache: true,
    inject: true
  }, options);

  this.options.config = Object.assign({
    appleStatusBarStyle: 'black-translucent',
    background: '#fff',
    theme_color: '#fff',
  }, options.config);

  this.options.config.icons = Object.assign({
    android: true,
    appleIcon: true,
    appleStartup: true,
    coast: false,
    favicons: true,
    firefox: true,
    opengraph: false,
    twitter: false,
    yandex: false,
    windows: false
  }, this.options.config.icons);
}

FaviconsWebpackPlugin.prototype.apply = function (compiler) {
  var self = this;
  if (!self.options.config.appName) {
    self.options.config.appName = guessAppName(compiler.context);
  } 

  // Generate the favicons
  var compilationResult;
  compiler.plugin('make', function (compilation, callback) {
    childCompiler.compileTemplate(self.options, compiler.context, compilation)
      .then(function (result) {
        compilationResult = result;
        callback();
      })
      .catch(callback);
  });

  // Hook into the html-webpack-plugin processing
  // and add the html
  if (self.options.inject) {
    compiler.plugin('compilation', function (compilation) {
      compilation.plugin('html-webpack-plugin-before-html-processing', function (htmlPluginData, callback) {
        if (htmlPluginData.plugin.options.favicons !== false) {
          htmlPluginData.html = htmlPluginData.html.replace(
            /(<\/head>)/i, compilationResult.stats.html.join('') + '$&');
        }
        callback(null, htmlPluginData);
      });
    });
  }

  // Remove the stats from the output if they are not required
  if (!self.options.emitStats) {
    compiler.plugin('emit', function (compilation, callback) {
      delete compilation.assets[compilationResult.outputName];
      callback();
    });
  }
};

/**
 * Tries to guess the name from the package.json
 */
function guessAppName (compilerWorkingDirectory) {
  var packageJson = path.resolve(compilerWorkingDirectory, 'package.json');
  if (!fs.existsSync(packageJson)) {
    packageJson = path.resolve(compilerWorkingDirectory, '../package.json');
    if (!fs.existsSync(packageJson)) {
      return 'Webpack App';
    }
  }
  return JSON.parse(fs.readFileSync(packageJson)).name;
}

module.exports = FaviconsWebpackPlugin;
