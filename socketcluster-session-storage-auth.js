(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.socketClusterSessionStorageAuth = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){(function (){
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
  
}).call(this)}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],"socketcluster-session-storage-auth":[function(require,module,exports){
const AuthEngine = require('./lib/auth');

module.exports = AuthEngine;
},{"./lib/auth":1}]},{},["socketcluster-session-storage-auth"])("socketcluster-session-storage-auth")
});
