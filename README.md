SocketCluster sessionStorage auth engine
======

Auth engine based on [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage) for SocketCluster client.

## Setting up

To install this module:
```bash
npm install https://github.com/philharmoniedeparis/socketcluster-session-storage-auth.git
```

## How to use

Follow the [socketcluster-client](https://github.com/SocketCluster/socketcluster-client/blob/master/README.md#how-to-use) installation instructions.  
Then add the custom auth engine script. The script is called `socketcluster-session-storage-auth.js` (located in the main socketcluster-session-storage-auth directory).
Embed it in your HTML page like this:
```html
<script type="text/javascript" src="/socketcluster-session-storage-auth.js"></script>
```
Once you have embedded the script `socketcluster-session-storage-auth.js` into your page, you will gain access to a global `socketClusterSessionStorageAuth` object.
You may also use CommonJS `require` or ES6 module imports.

### Connect to a server

```js
let socket = socketClusterClient.create({
  hostname: 'localhost',
  port: 8000,
  authEngine: new socketClusterSessionStorageAuth()
});
```

## Developing

### Install all dependencies

- Clone this repo: `git clone git@github.com:philharmoniedeparis/socketcluster-session-storage-auth.git`
- Navigate to project directory: `cd socketcluster-session-storage-auth.git`
- Install all dependencies: `npm install`

### Running the tests

To run the tests:

```bash
npm test
```

### Building

To build the socketClusterSessionStorageAuth script:

```bash
npm run build
```

### Credits

Most of the code in this repository is a slight adaptation of the build-in [socketcluster-client](https://github.com/SocketCluster/socketcluster-client) [auth engine](https://github.com/SocketCluster/socketcluster-client/blob/master/lib/auth.js) to change the use of [localStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/localStorage) by [sessionStorage](https://developer.mozilla.org/en-US/docs/Web/API/Window/sessionStorage).