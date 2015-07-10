'use strict';

var fs = require('fs');

// Get the node-firefox modules we need
var firefox = {
  connect: require('node-firefox-connect'),
  startSimulator: require('node-firefox-start-simulator'),
  installApp: require('node-firefox-install-app'),
  findApp: require('node-firefox-find-app'),
  launchApp: require('node-firefox-launch-app'),
  console: require('node-firefox-console')
};

// You could also use the node-firefox module as a shortcut:
// var firefox = require('node-firefox');

// Uses the sample from node-firefox-install-app, assuming you have a copy of
// it. Substitute your own app as needed.
var appPath = './node-firefox-install-app/examples/sampleApp';
var appManifest = JSON.parse(fs.readFileSync(appPath + '/manifest.webapp'));

var appConsole;

// Use a utility function to get connected to a simulator running an app
startSimulatorAndLaunchApp().then(function(client) {

  // Use the client to find a running instance of the named app
  return firefox.console({
    client: client,
    manifest: appManifest
  });

}).then(function(result) {

  // Stash a reference to the console for later use.
  appConsole = result;

  // Try running some JS in the console.
  return appConsole.evaluateJS('2 + 2');

}).then(function(evalResult) {

  console.log('RESULT', evalResult);
  /*
    RESULT { input: '2 + 2',
      result: 4,
      timestamp: 1436546733987,
      exception: undefined,
      helperResult: null }
  */

  // Run some JS in the console.
  return appConsole.evaluateJS('console.log("This is a log message")');

}).then(function(evalResult) {

  // Fetching log messages waiting to be read.
  return appConsole.getCachedLogs();

}).then(function(logMessages) {

  console.log('MESSAGES', logMessages);
  /*
    MESSAGES [ { arguments: [ 'This is a log message' ],
      counter: null,
      filename: 'app://317fb7a0-c122-11e4-947c-bb05ca0c1b01/app.js',
      functionName: '',
      groupName: '',
      level: 'log',
      lineNumber: 2,
      private: false,
      styles: [],
      timeStamp: 1436547078070,
      timer: null,
      _type: 'ConsoleAPI' } ]
  */

  // Clear the message cache since we've fetched them
  return appConsole.clearCachedLogs();

}).then(function() {

  // Get a stream of log messages
  return appConsole.getLogStream();

}).then(function(stream) {

  // Listen for log messages with a data handler
  stream.on('data', function(message) {
    console.log('STREAM DATA', message);
  });

  // Run some more JS in the console.
  return appConsole.evaluateJS('console.log("HELLO WORLD")');

}).then(function(result) {

  // Note that no log messages may be displayed, if your program exits here
  // before it's had a chance to receive any. But, you might see something like
  // this:

  /*
    STREAM DATA { arguments: [ 'HELLO WORLD' ],
      counter: null,
      filename: 'debugger eval code',
      functionName: '',
      groupName: '',
      level: 'log',
      lineNumber: 1,
      private: false,
      styles: [],
      timeStamp: 1436547271216,
      timer: null }
  */


}).catch(function(err) {
  // Some errors to anticipate here:
  // - Could not connect to Firefox
  // - Could not find the named app running or installed
  console.error(err);
});

// Utility function to get us to a running app on a simulator with a
// connected client.
function startSimulatorAndLaunchApp() {
  var client;

  return firefox.startSimulator().then(function(simulator) {
    return firefox.connect(simulator.port);
  }).then(function(result) {
    client = result;
    return firefox.installApp({
      client: client,
      appPath: appPath
    });
  }).then(function(appId) {
    return firefox.findApp({
      client: client,
      manifest: appManifest
    });
  }).then(function(apps) {
    return firefox.launchApp({
      client: client,
      manifestURL: apps[0].manifestURL
    });
  }).then(function() {
    return client;
  });
}
