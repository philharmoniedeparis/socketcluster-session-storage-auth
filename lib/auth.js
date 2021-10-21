function AuthEngine() {
    this._internalStorage = {};
    this.isSessionStorageEnabled = this._checkSessionStorageEnabled();
  }
  
  AuthEngine.prototype._checkSessionStorageEnabled = function () {
    let err;
    try {
      // Some browsers will throw an error here if sessionStorage is disabled.
      // Firefox, for example, does so in privat browsing.
      global.sessionStorage;
  
      // Safari, in Private Browsing Mode, looks like it supports sessionStorage but all calls to setItem
      // throw QuotaExceededError. We're going to detect this and avoid hard to debug edge cases.
      global.sessionStorage.setItem('__scSessionStorageTest', 1);
      global.sessionStorage.removeItem('__scSessionStorageTest');
    } catch (e) {
      err = e;
    }
    return !err;
  };
  
  AuthEngine.prototype.saveToken = function (name, token, options) {
    if (this.isSessionStorageEnabled && global.sessionStorage) {
      global.sessionStorage.setItem(name, token);
    } else {
      this._internalStorage[name] = token;
    }
    return Promise.resolve(token);
  };
  
  AuthEngine.prototype.removeToken = function (name) {
    let loadPromise = this.loadToken(name);
  
    if (this.isSessionStorageEnabled && global.sessionStorage) {
      global.sessionStorage.removeItem(name);
    } else {
      delete this._internalStorage[name];
    }
  
    return loadPromise;
  };
  
  AuthEngine.prototype.loadToken = function (name) {
    let token;
  
    if (this.isSessionStorageEnabled && global.sessionStorage) {
      token = global.sessionStorage.getItem(name);
    } else {
      token = this._internalStorage[name] || null;
    }
  
    return Promise.resolve(token);
  };
  
  module.exports = AuthEngine;
  