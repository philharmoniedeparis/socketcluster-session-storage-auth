#!/bin/sh

SDK_VERSION=$(cat package.json | sed -n -e '/version/ s/.*: *"\([^"]*\).*/\1/p')
echo "Building JavaScript SDK v$SDK_VERSION...\n"
browserify -s socketClusterSessionStorageAuth index.js > socketcluster-session-storage-auth.js && uglifyjs socketcluster-session-storage-auth.js -o socketcluster-session-storage-auth.min.js