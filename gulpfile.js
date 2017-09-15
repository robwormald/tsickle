/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

require('source-map-support').install();

var clangFormat = require('clang-format');
var formatter = require('gulp-clang-format');
var fs = require('fs');
var gulp = require('gulp');
var gutil = require('gulp-util');
var merge = require('merge2');
var mocha = require('gulp-mocha');
var sourcemaps = require('gulp-sourcemaps');
var ts = require('gulp-typescript');
var tslint = require('gulp-tslint');
var typescript = require('typescript');
var child = require('child_process');

var tsProject = ts.createProject('tsconfig.json', {
  // Specify the TypeScript version we're using.
  typescript: typescript,
});

const formatted = ['*.js', 'src/**/*.ts', 'test/**/*.ts'];

gulp.task('format', function() {
  return gulp.src(formatted, {base: '.'})
      .pipe(formatter.format('file', clangFormat))
      .pipe(gulp.dest('.'));
});

gulp.task('test.check-format', function() {
  return gulp.src(formatted)
      .pipe(formatter.checkFormat('file', clangFormat, {verbose: true}))
      .on('warning', onError);
});

gulp.task('test.check-lint', function() {
  return gulp.src(['src/**/*.ts', 'test/**/*.ts'])
      .pipe(tslint({formatter: 'verbose'}))
      .pipe(tslint.report())
      .on('warning', onError);
});

var hasError;
var failOnError = true;

var onError = function(err) {
  hasError = true;
  if (failOnError) {
    process.exit(1);
  }
};

gulp.task('compile', function(done) {
  hasError = false;
  const processHandle = child.spawn('bazel', ['build', 'src'], {encoding: 'utf8'});
  let stderr = '';
  processHandle.stderr.setEncoding('utf8');
  processHandle.stderr.on('data', (data) => {
    stderr += data;
  });
  processHandle.on('exit', (code, signal) => {
    if (code !== 0) {
      gutil.log(stderr);
      onError();
      done();
      return;
    }
    gulp.src(['bazel-bin/src/*'])
        .pipe(gulp.dest('built/src', {mode: '0644'}))
        .on('end', () => done());
  });
});

gulp.task('test.compile', ['compile'], function(done) {
  if (hasError) {
    done();
    return;
  }
  const processHandle = child.spawn('bazel', ['build', 'test'], {encoding: 'utf8'});
  let stderr = '';
  processHandle.stderr.setEncoding('utf8');
  processHandle.stderr.on('data', (data) => {
    stderr += data;
  });
  processHandle.on('exit', (code, signal) => {
    if (code !== 0) {
      gutil.log(stderr);
      onError();
      done();
      return;
    }
    gulp.src(['bazel-bin/test/*'])
        .pipe(gulp.dest('built/test', {mode: '0644'}))
        .on('end', () => done());
  });
});

gulp.task('test.unit', ['test.compile'], function(done) {
  if (hasError) {
    done();
    return;
  }
  return gulp.src(['built/test/**/*.js', '!built/test/**/e2e*.js', '!built/test/**/golden*.js'])
      .pipe(mocha({timeout: 1000}));
});

gulp.task('test.e2e', ['test.compile'], function(done) {
  if (hasError) {
    done();
    return;
  }
  return gulp.src(['built/test/**/e2e*.js']).pipe(mocha({timeout: 25000}));
});

gulp.task('test.golden', ['test.compile'], function(done) {
  if (hasError) {
    done();
    return;
  }
  return gulp.src(['built/test/**/golden*.js']).pipe(mocha({timeout: 1000}));
});

gulp.task('test', ['test.unit', 'test.e2e', 'test.golden', 'test.check-format', 'test.check-lint']);

gulp.task('watch', function() {
  failOnError = false;
  gulp.start(['test.unit', 'test.golden']);  // Trigger initial build.
  return gulp.watch(['src/**/*.ts', 'test/**/*.ts', 'test_files/**'], ['test.unit', 'test.golden']);
});

gulp.task('default', ['compile']);
