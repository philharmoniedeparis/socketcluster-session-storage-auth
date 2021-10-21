var gulp = require('gulp');
var browserify = require('browserify');
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var source = require('vinyl-source-stream');
var uglify = require('uglify-es');
var uglifyComposer = require('gulp-uglify/composer');
var minify = uglifyComposer(uglify, console);
var convertNewline = require('gulp-convert-newline');

var DIST = './';

gulp.task('browserify', function (done) {
  var stream = browserify({
    entries: 'index.js',
    standalone: 'socketClusterSessionStorageAuth'
  })
    .require('./index.js', {
      expose: 'socketcluster-session-storage-auth'
    })
    .bundle();
  return stream.pipe(source('socketcluster-session-storage-auth.js'))
    .pipe(convertNewline({
      newline: 'lf',
      encoding: 'utf8'
    }))
    .pipe(gulp.dest(DIST));
});

gulp.task('minify', function () {
  return gulp.src(DIST + 'socketcluster-session-storage-auth.js')
    .pipe(babel({
      comments: false
    }))
    .pipe(babel({
      plugins: ['minify-dead-code-elimination']
    }))
    .pipe(minify())
    .pipe(rename({
      extname: '.min.js'
    }))
    .pipe(gulp.dest(DIST));
});