const assert = require('assert');
const socketClusterServer = require('socketcluster-server');
const socketClusterClient = require('socketcluster-client');
const Storage = require('dom-storage');
const socketClusterSessionStorageAuth = require('../');

// Add to the global scope like in browser.
global.sessionStorage = new Storage(null, { strict: true });;

const PORT_NUMBER = 8009;

let clientOptions;
let serverOptions;

let allowedUsers = {
  bob: true,
  kate: true,
  alice: true
};

let server, client;
let validSignedAuthTokenBob = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImJvYiIsImV4cCI6MzE2Mzc1ODk3ODIxNTQ4NywiaWF0IjoxNTAyNzQ3NzQ2fQ.GLf_jqi_qUSCRahxe2D2I9kD8iVIs0d4xTbiZMRiQq4';
let validSignedAuthTokenKate = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6ImthdGUiLCJleHAiOjMxNjM3NTg5NzgyMTU0ODcsImlhdCI6MTUwMjc0Nzc5NX0.Yfb63XvDt9Wk0wHSDJ3t7Qb1F0oUVUaM5_JKxIE2kyw';
let invalidSignedAuthToken = 'fakebGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.fakec2VybmFtZSI6ImJvYiIsImlhdCI6MTUwMjYyNTIxMywiZXhwIjoxNTAyNzExNjEzfQ.fakemYcOOjM9bzmS4UYRvlWSk_lm3WGHvclmFjLbyOk';

const TOKEN_EXPIRY_IN_SECONDS = 60 * 60 * 24 * 366 * 5000;

function wait(duration) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve();
    }, duration);
  });
};

function connectionHandler(socket) {
  async function handleLogin() {
    let rpc = await socket.procedure('login').once();
    if (allowedUsers[rpc.data.username]) {
      rpc.data.exp = Math.round(Date.now() / 1000) + TOKEN_EXPIRY_IN_SECONDS;
      socket.setAuthToken(rpc.data);
      rpc.end();
    } else {
      let err = new Error('Failed to login');
      err.name = 'FailedLoginError';
      rpc.error(err);
    }
  }
  handleLogin();

  async function handleSetAuthKey() {
    let rpc = await socket.procedure('setAuthKey').once();
    server.signatureKey = rpc.data;
    server.verificationKey = rpc.data;
    rpc.end();
  }
  handleSetAuthKey();

  async function handlePerformTask() {
    for await (let rpc of socket.procedure('performTask')) {
      setTimeout(function () {
        rpc.end();
      }, 1000);
    }
  }
  handlePerformTask();
};

describe('Integration tests', function () {
  beforeEach('Run the server before start', async function () {
    serverOptions = {
      authKey: 'testkey',
      ackTimeout: 200
    };

    server = socketClusterServer.listen(PORT_NUMBER, serverOptions);
    async function handleServerConnection() {
      for await (let {socket} of server.listener('connection')) {
        connectionHandler(socket);
      }
    }
    handleServerConnection();

    clientOptions = {
      hostname: '127.0.0.1',
      port: PORT_NUMBER,
      ackTimeout: 200,
      authEngine: new socketClusterSessionStorageAuth()
    };

    await server.listener('ready').once();
  });

  afterEach('Shut down server and clients afterwards', async function () {
    let cleanupTasks = [];
    global.sessionStorage.removeItem('socketcluster.authToken');
    if (client) {
      if (client.state !== client.CLOSED) {
        cleanupTasks.push(
          Promise.race([
            client.listener('disconnect').once(),
            client.listener('connectAbort').once()
          ])
        );
        client.disconnect();
      } else {
        client.disconnect();
      }
    }
    cleanupTasks.push(
      (async () => {
        server.httpServer.close();
        await server.close();
      })()
    );
    await Promise.all(cleanupTasks);
  });

  describe('Authentication', function () {
    it('Should not send back error if JWT is not provided in handshake', async function () {
      client = socketClusterClient.create(clientOptions);
      let event = await client.listener('connect').once();
      assert.equal(event.authError === undefined, true);
    });

    it('Should be authenticated on connect if previous JWT token is present', async function () {
      global.sessionStorage.setItem('socketcluster.authToken', validSignedAuthTokenBob);
      client = socketClusterClient.create(clientOptions);

      let event = await client.listener('connect').once();
      assert.equal(client.authState, 'authenticated');
      assert.equal(event.isAuthenticated, true);
      assert.equal(event.authError === undefined, true);
    });

    it('Should send back error if JWT is invalid during handshake', async function () {
      global.sessionStorage.setItem('socketcluster.authToken', validSignedAuthTokenBob);
      client = socketClusterClient.create(clientOptions);

      let event = await client.listener('connect').once();
      assert.notEqual(event, null);
      assert.equal(event.isAuthenticated, true);
      assert.equal(event.authError, null);

      assert.notEqual(client.signedAuthToken, null);
      assert.notEqual(client.authToken, null);

      // Change the setAuthKey to invalidate the current token.
      await client.invoke('setAuthKey', 'differentAuthKey');

      client.disconnect();
      client.connect();

      event = await client.listener('connect').once();

      assert.equal(event.isAuthenticated, false);
      assert.notEqual(event.authError, null);
      assert.equal(event.authError.name, 'AuthTokenInvalidError');

      // When authentication fails, the auth token properties on the client
      // socket should be set to null; that way it's not going to keep
      // throwing the same error every time the socket tries to connect.
      assert.equal(client.signedAuthToken, null);
      assert.equal(client.authToken, null);

      // Set authKey back to what it was.
      await client.invoke('setAuthKey', serverOptions.authKey);
    });

    it('Should allow switching between users', async function () {
      global.sessionStorage.setItem('socketcluster.authToken', validSignedAuthTokenBob);
      client = socketClusterClient.create(clientOptions);
      let authenticateTriggered = false;
      let authStateChangeTriggered = false;

      await client.listener('connect').once();

      assert.notEqual(client.authToken, null);
      assert.equal(client.authToken.username, 'bob');

      client.invoke('login', {username: 'alice'});

      (async () => {
        await client.listener('authenticate').once();
        authenticateTriggered = true;
        assert.equal(client.authState, 'authenticated');
        assert.notEqual(client.authToken, null);
        assert.equal(client.authToken.username, 'alice');
      })();

      (async () => {
        await client.listener('authStateChange').once();
        authStateChangeTriggered = true;
      })();

      await wait(100);

      assert.equal(authenticateTriggered, true);
      assert.equal(authStateChangeTriggered, false);
    });

    it('Should go through the correct sequence of authentication state changes when dealing with disconnections; part 2', async function () {
      global.sessionStorage.setItem('socketcluster.authToken', validSignedAuthTokenBob);
      client = socketClusterClient.create(clientOptions);

      let expectedAuthStateChanges = [
        'unauthenticated->authenticated',
        'authenticated->unauthenticated',
        'unauthenticated->authenticated',
        'authenticated->unauthenticated'
      ];
      let authStateChanges = [];

      (async () => {
        for await (status of client.listener('authStateChange')) {
          authStateChanges.push(status.oldAuthState + '->' + status.newAuthState);
        }
      })();

      assert.equal(client.authState, 'unauthenticated');

      await client.listener('connect').once();

      assert.equal(client.authState, 'authenticated');
      client.deauthenticate();
      assert.equal(client.authState, 'unauthenticated');
      let authenticatePromise = client.authenticate(validSignedAuthTokenBob);
      assert.equal(client.authState, 'unauthenticated');

      await authenticatePromise;

      assert.equal(client.authState, 'authenticated');

      client.disconnect();

      assert.equal(client.authState, 'authenticated');
      await client.deauthenticate();
      assert.equal(client.authState, 'unauthenticated');

      assert.equal(JSON.stringify(authStateChanges), JSON.stringify(expectedAuthStateChanges));
    });

    it('Should go through the correct sequence of authentication state changes when dealing with disconnections; part 3', async function () {
      global.sessionStorage.setItem('socketcluster.authToken', validSignedAuthTokenBob);
      client = socketClusterClient.create(clientOptions);

      let expectedAuthStateChanges = [
        'unauthenticated->authenticated',
        'authenticated->unauthenticated'
      ];
      let authStateChanges = [];

      (async () => {
        for await (let status of client.listener('authStateChange')) {
          authStateChanges.push(status.oldAuthState + '->' + status.newAuthState);
        }
      })();

      assert.equal(client.authState, 'unauthenticated');

      await client.listener('connect').once();

      assert.equal(client.authState, 'authenticated');
      let authenticatePromise = client.authenticate(invalidSignedAuthToken);
      assert.equal(client.authState, 'authenticated');

      try {
        await authenticatePromise;
      } catch (err) {
        assert.notEqual(err, null);
        assert.equal(err.name, 'AuthTokenInvalidError');
        assert.equal(client.authState, 'unauthenticated');
        assert.equal(JSON.stringify(authStateChanges), JSON.stringify(expectedAuthStateChanges));
      }
    });

    it('Should go through the correct sequence of authentication state changes when authenticating as a user while already authenticated as another user', async function () {
      global.sessionStorage.setItem('socketcluster.authToken', validSignedAuthTokenBob);
      client = socketClusterClient.create(clientOptions);

      let expectedAuthStateChanges = [
        'unauthenticated->authenticated'
      ];
      let authStateChanges = [];

      (async () => {
        for await (let status of client.listener('authStateChange')) {
          authStateChanges.push(status.oldAuthState + '->' + status.newAuthState);
        }
      })();

      let expectedAuthTokenChanges = [
        validSignedAuthTokenBob,
        validSignedAuthTokenKate
      ];
      let authTokenChanges = [];

      (async () => {
        for await (let event of client.listener('authenticate')) {
          authTokenChanges.push(client.signedAuthToken);
        }
      })();

      (async () => {
        for await (let event of client.listener('deauthenticate')) {
          authTokenChanges.push(client.signedAuthToken);
        }
      })();

      assert.equal(client.authState, 'unauthenticated');

      await client.listener('connect').once();

      assert.equal(client.authState, 'authenticated');
      assert.equal(client.authToken.username, 'bob');
      let authenticatePromise = client.authenticate(validSignedAuthTokenKate);

      assert.equal(client.authState, 'authenticated');

      await authenticatePromise;

      assert.equal(client.authState, 'authenticated');
      assert.equal(client.authToken.username, 'kate');
      assert.equal(JSON.stringify(authStateChanges), JSON.stringify(expectedAuthStateChanges));
      assert.equal(JSON.stringify(authTokenChanges), JSON.stringify(expectedAuthTokenChanges));
    });
  });
});
