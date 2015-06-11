'use strict';

// See https://github.com/jshint/jshint/issues/1747 for context
/* global -Promise */
var Promise = require('es6-promise').Promise;
var stream = require('stream');

module.exports = function(options) {

  options = options || {};

  var client = options.client;
  var manifest = options.manifest;

  var webAppsActor;
  return getWebAppsActor(client).then(function(result) {

    webAppsActor = result;

    return Promise.all([
      webAppsActor.getInstalledApps(),
      webAppsActor.listRunningApps()
    ]);

  }).then(function(results) {

    var installedApps = results[0];
    var runningAppIds = results[1];

    // Find installed & running apps that match the manifest
    var selectedRunningAppIds = installedApps.filter(function(app) {
      return app.name === manifest.name &&
             runningAppIds.indexOf(app.manifestURL) !== -1;
    }).map(function(app) {
      return app.manifestURL;
    });

    if (selectedRunningAppIds.length === 0) {
      throw new Error('app not installed and running');
    }

    // Finally, get a console for the first installed & running app.
    return webAppsActor.getApp(selectedRunningAppIds[0]);

  }).then(function(app) {

    // Wrap the useful methods of Console in promise handlers
    var wrapped = promisifyMethods(app.Console, [
      'startListening',
      'stopListening',
      'evaluateJS',
      'getCachedLogs',
      'clearCachedLogs'
    ]);

    // Enhance by injecting log stream helper
    wrapped.getLogStream = getLogStream.bind(wrapped);

    return wrapped;

  });

};

// Method to wrap a stream around console log events.
function getLogStream(options) {
  options = options || {
    logs: true
  };

  /*jshint validthis:true */
  var self = this;

  return self.startListening().then(function(result) {

    var logStream = new stream.Readable({ objectMode: true });
    logStream._read = function() {};

    // Normal log output on by default.
    if (options.logs) {
      self.on('console-api-call', function(event) {
        logStream.push(event);
      });
    }

    // Error messages off by default.
    if (options.errors) {
      self.on('page-error', function(event) {
        logStream.push(event);
      });
    }

    return logStream;

  });
}

// Get a webapps actor and wrap the methods we'll use in promises.
function getWebAppsActor(client) {
  return new Promise(function(resolve, reject) {
    client.getWebapps(function(err, webapps) {
      if (err) { return reject(err); }
      return resolve(promisifyMethods(webapps, [
        'getInstalledApps',
        'listRunningApps',
        'getApp'
      ]));
    });
  });
}

// Wrap named methods in a context object in callback-to-promise handlers
// TODO: Move this into a node-firefox common module & use elsewhere?
function promisifyMethods(context, methodNames) {
  methodNames.forEach(function(name) {
    var originalMethod = context[name];
    context[name] = function() {
      var mutableArguments = Array.prototype.slice.call(arguments, 0);
      return new Promise(function(resolve, reject) {
        mutableArguments.push(function(err, result) {
          return err ? reject(err) : resolve(result);
        });
        originalMethod.apply(context, mutableArguments);
      });
    };
  });
  return context;
}
