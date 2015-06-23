'use strict';

// See https://github.com/jshint/jshint/issues/1747 for context
/* global -Promise */
var Promise = require('es6-promise').Promise;

var nodemock = require('nodemock');

var firefox = {
  console: require('../../index')
};

module.exports = {

  'firefox.console() should call client methods to get a console': function(test) {
    var mockClient = buildMockClient({
      shouldCallGetApp: true
    });
    firefox.console({
      client: mockClient,
      manifest: MANIFEST
    }).then(function(appConsole) {
      test.ok(appConsole !== null);
      test.ok(mockClient._mocked.assert());
      return test.done();
    }).catch(function() {
      test.ok(false);
      return test.done();
    });
  },

  'firefox.console() should yield an error if the app is not installed': function(test) {
    var mockClient = buildMockClient({
      shouldCallGetApp: false
    });
    firefox.console({
      client: mockClient,
      manifest: MANIFEST_NOT_INSTALLED
    }).then(function(appConsole) {
      test.ok(false, 'A console should not have been returned');
      return test.done();
    }).catch(function(err) {
      test.equal(err.message, 'app not installed and running');
      test.ok(mockClient._mocked.assert());
      test.done();
    });
  },

  'firefox.console() should yield an error if the app is not running': function(test) {
    var mockClient = buildMockClient({
      shouldCallGetApp: false
    });
    firefox.console({
      client: mockClient,
      manifest: MANIFEST_NOT_RUNNING
    }).then(function(appConsole) {
      test.ok(false, 'A console should not have been returned');
      return test.done();
    }).catch(function(err) {
      test.equal(err.message, 'app not installed and running');
      test.ok(mockClient._mocked.assert());
      test.done();
    });
  },

  'console object methods should be wrapped in promise handlers': function(test) {

    var mockClient = buildMockClient({
      shouldCallGetApp: true,
      shouldCallConsoleMethods: true
    });

    var appConsole;

    firefox.console({
      client: mockClient,
      manifest: MANIFEST
    }).then(function(result) {
      appConsole = result;
      test.ok(appConsole !== null);
      return appConsole.startListening();
    }).then(function(result) {
      return appConsole.evaluateJS(JS_EXPR);
    }).then(function(result) {
      return appConsole.getCachedLogs();
    }).then(function(result) {
      return appConsole.clearCachedLogs();
    }).then(function(result) {
      return appConsole.stopListening();
    }).then(function(results) {
      return test.done();
    }).catch(function(err) {
      test.equal(err.message, 'app not installed and running');
      test.ok(mockClient._mocked.assert());
      test.done();
    });

  },

  'getLogStream should support log events': logStreamTestCase(true, false),

  'getLogStream should support error events': logStreamTestCase(false, true),

  'getLogStream should support both log and error events': logStreamTestCase(true, true)

};

function logStreamTestCase(useLogs, useErrors) {

  return function(test) {

    var mockClient = buildMockClient({
      shouldUseEvents: true,
      shouldCallGetApp: true,
      shouldCallConsoleMethods: true,
      consoleMethodNames: [ 'startListening' ]
    });

    var appConsole;
    var dataReceived = [];
    var logEvent = { message: 'log1' };
    var errorEvent = { message: 'error1' };

    firefox.console({
      client: mockClient,
      manifest: MANIFEST
    }).then(function(result) {

      appConsole = result;
      test.ok(appConsole !== null);
      return appConsole.getLogStream({
        logs: useLogs,
        errors: useErrors
      });

    }).then(function(logStream) {

      // Ensure the expected event handlers have been registered
      test.equal(useLogs, 'console-api-call' in mockClient._eventHandlers);
      test.equal(useErrors, 'page-error' in mockClient._eventHandlers);

      // Process events from the log stream.
      logStream.on('data', function(data) {
        dataReceived.push(data);
      });

      // Send the events
      if (useLogs) {
        mockClient._eventHandlers['console-api-call'](logEvent);
      }
      if (useErrors) {
        mockClient._eventHandlers['page-error'](errorEvent);
      }

      // Return a promise that yields to the event loop
      return new Promise(function(resolve, reject) {
        setImmediate(resolve);
      });

    }).then(function(logStream) {

      var expectedDataLength = (useLogs ? 1 : 0) + (useErrors ? 1 : 0);
      test.equal(dataReceived.length, expectedDataLength);

      if (useLogs) {
        test.equal(dataReceived.shift(), logEvent);
      }
      if (useErrors) {
        test.equal(dataReceived.shift(), errorEvent);
      }

      test.ok(mockClient._mocked.assert());
      return test.done();

    }).catch(function(err) {

      console.error(err);
      test.done();

    });

  };

}

var APP_ID = '8675309';

var APP_NAME = 'Test App';

var APP_MANIFEST_URL = 'app://' + APP_ID + '/manifest.webapp';

var MANIFEST = {
  id: APP_ID,
  manifestURL: APP_MANIFEST_URL,
  name: APP_NAME
};

var APP_ID_NOT_RUNNING = 'ou812';

var MANIFEST_NOT_RUNNING = {
  id: APP_ID_NOT_RUNNING,
  manifestURL: 'app://' + APP_ID_NOT_RUNNING + '/manifest.webapp',
  name: 'Not running app'
};

var MANIFEST_NOT_INSTALLED = {
  id: 'lolidk',
  manifestURL: 'app://lolidk/manifest.webapp',
  name: 'Not installed app'
};

var INSTALLED_APPS = [
  MANIFEST,
  MANIFEST_NOT_RUNNING
];

var RUNNING_APPS = [
  'app://system.gaiamobile.org/manifest.webapp',
  'app://costcontrol.gaiamobile.org/manifest.webapp',
  'app://callscreen.gaiamobile.org/manifest.webapp',
  'app://verticalhome.gaiamobile.org/manifest.webapp',
  APP_MANIFEST_URL,
  'app://findmydevice.gaiamobile.org/manifest.webapp',
  'app://settings.gaiamobile.org/manifest.webapp',
  'app://ad97abe0-00bf-11e5-ab12-d5ad5262fbe2/manifest.webapp',
  'app://keyboard.gaiamobile.org/manifest.webapp'
];

// nodemock expects an empty function to indicate a callback parameter
var CALLBACK_TYPE = function() {};

var CONSOLE_METHOD_NAMES = [
  'startListening', 'stopListening', 'getCachedLogs',
  'clearCachedLogs', 'evaluateJS'
];

var JS_EXPR = '1 + 1';

function buildMockClient(options) {

  var mocked = nodemock
    .mock('getInstalledApps')
    .takes(CALLBACK_TYPE)
    .calls(0, [null, INSTALLED_APPS]);

  mocked.mock('listRunningApps')
    .takes(CALLBACK_TYPE)
    .calls(0, [null, RUNNING_APPS]);

  var consoleMethodNames = options.consoleMethodNames || CONSOLE_METHOD_NAMES;

  if (!options.shouldCallConsoleMethods) {
    consoleMethodNames.forEach(function(name) {
      mocked.mock(name).fail();
    });
  } else {

    if (consoleMethodNames.indexOf('evaluateJS') !== -1) {
      mocked.mock('evaluateJS')
        .takes(JS_EXPR, CALLBACK_TYPE)
        .calls(1, [null, true]);
    }

    consoleMethodNames.forEach(function(name) {
      if (name === 'evaluateJS') {
        return;
      }
      mocked.mock(name)
        .takes(CALLBACK_TYPE)
        .calls(0, [null, true]);
    });

  }

  var eventHandlers = {};
  var onEvent;
  if (!options.shouldUseEvents) {
    mocked.mock('onEvent').fail();
    onEvent = mocked.onEvent;
  } else {
    onEvent = function(name, handler) {
      eventHandlers[name] = handler;
    };
  }

  var mockApp = {
    Console: {
      startListening: mocked.startListening,
      stopListening: mocked.stopListening,
      evaluateJS: mocked.evaluateJS,
      getCachedLogs: mocked.getCachedLogs,
      clearCachedLogs: mocked.clearCachedLogs,
      on: onEvent
    }
  };

  if (options.shouldCallGetApp) {
    mocked.mock('getApp')
      .takes(APP_MANIFEST_URL, CALLBACK_TYPE)
      .calls(1, [null, mockApp]);
  } else {
    mocked.mock('getApp').fail();
  }

  return {
    // HACK: Include a reference to `mocked` to assert method calls later.
    _mocked: mocked,
    _eventHandlers: eventHandlers,
    getWebapps: function(webappsCallback) {
      webappsCallback(null, {
        getInstalledApps: mocked.getInstalledApps,
        listRunningApps: mocked.listRunningApps,
        getApp: mocked.getApp
      });
    }
  };

}
