# node-firefox-console [![Build Status](https://secure.travis-ci.org/mozilla/node-firefox-console.png?branch=master)](http://travis-ci.org/mozilla/node-firefox-console)

> Access the JavaScript console on a running Firefox app

This is part of the [node-firefox](https://github.com/mozilla/node-firefox) project.

## Installation

### From git

```bash
git clone https://github.com/mozilla/node-firefox-console.git
cd node-firefox-console
npm install
```

If you want to update later on:

```bash
cd node-firefox-console
git pull origin master
npm install
```

### npm

```bash
npm install node-firefox-console
```

## Usage

See `examples/usage.js` for a fuller example, but in brief:

```javascript
var firefox = {
  console: require('node-firefox-console')
};

firefox.console(options).then(function(appConsole) {
  // appConsole instance can be used to interact with app
}).catch(function(error) {
  // an error will occur if the identified app is not installed and running
});
```

where `options` is a plain Object with the following expected properties:

* `client`: a client connected to Firefox, e.g. created via `node-firefox-connect`

* `manifest`: an Object parsed from an [App manifest](https://developer.mozilla.org/en-US/Apps/Build/Manifest), where the `name` property is used to find an installed and running app.

The `appConsole` instance offers the following methods, each of which returns a
Promise:

* `evaluateJS(expr)`: send a string (`expr`) containing a JavaScript expression
  to the app's console

* `getCachedLogs()`: fetch any console log messages cached and waiting to be read

* `clearCachedLogs()`: clear cached console log messages - `getCachedLogs()`
  does not do this automatically.

* `getLogStream(options)`: build a [stream][] to handle live console log
  messages. `options` is a plain Object expecting two optional boolean
  properties: 

  * `logs` (default: `true`): whether to stream plain log messages 

  * `errors` (default: `false`): whether to stream error log messages 

[stream]: https://nodejs.org/api/stream.html

## Running the tests

After installing, you can simply run the following from the module folder:

```bash
npm test
```

To add a new unit test file, create a new file in the `tests/unit` folder. Any file that matches `test.*.js` will be run as a test by the appropriate test runner, based on the folder location.

We use `gulp` behind the scenes to run the test; if you don't have it installed globally you can use `npm gulp` from inside the project's root folder to run `gulp`.

### Code quality and style

Because we have multiple contributors working on our projects, we value consistent code styles. It makes it easier to read code written by many people! :-)

Our tests include unit tests as well as code quality ("linting") tests that make sure our test pass a style guide and [JSHint](http://jshint.com/). Instead of submitting code with the wrong indentation or a different style, run the tests and you will be told where your code quality/style differs from ours and instructions on how to fix it.

## History

This is based on initial work on [fxos-console](https://github.com/nicola/fxos-console) by Nicola Greco.

## License

This program is free software; it is distributed under an
[Apache License](https://github.com/mozilla/node-firefox-console/blob/master/LICENSE).

## Copyright

Copyright (c) 2015 [Mozilla](https://mozilla.org)
([Contributors](https://github.com/mozilla/node-firefox-console/graphs/contributors)).

