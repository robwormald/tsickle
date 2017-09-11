/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-unused-expression mocha .to.be.empty getters.

import {assert, expect} from 'chai';
import * as path from 'path';
import {SourceMapConsumer} from 'source-map';
import * as ts from 'typescript';

import {transformer} from '../src/class_decorator_downlevel_transformer';
import * as cliSupport from '../src/cli_support';
import {convertDecorators} from '../src/decorator-annotator';
import {DefaultSourceMapper, getInlineSourceMapCount, setInlineSourceMap, sourceMapTextToConsumer} from '../src/source_map_utils';
import {createCustomTransformers} from '../src/transformer_util';
import * as tsickle from '../src/tsickle';
import {createSourceReplacingCompilerHost} from '../src/util';

import * as testSupport from './test_support';

describe('transformer prototype', () => {
  it('adds a comment to variable declarations', () => {
    const sources = new Map<string, string>();
    sources.set('input.ts', `/** @Annotation */
    function classAnnotation(t: any) { return t; }

        @classAnnotation
        @classAnnotation
        class foo {}`);
    // Run tsickle+TSC to convert inputs to Closure JS files.
    const {js, sourceMap} = compile(sources);

    console.log(js);
    // sourceMapTextToConsumer(sourceMap).eachMapping((m) => console.log(JSON.stringify(m)));

    expect(js).to.exist;
  });

  it.only('adds a comment to variable declarations', () => {
    const sources = new Map<string, string>();
    sources.set('input.ts', `import {BClass} from './exporter';
    function decorator(a: Object, b: string) {}
    function classAnnotation(t: any) { return t; }

    class AClass {}

    @classAnnotation
    class DecoratorTest {
      @decorator
      private y: AClass;
      @decorator
      private z: BClass;
    }`);
    sources.set('exporter.ts', `export class BClass {};`);
    // const sources = testSupport.readSources(['test_files/decorator/decorator.ts',
    // 'test_files/decorator/external.ts', 'test_files/decorator/external2.ts']);
    const {js, sourceMap} = compile(sources);
    console.log(js);
    // const js = testSupport.compileWithTransfromer(sources,
    // testSupport.compilerOptions).files.get('./input.js'); console.log(js);
    // sourceMapTextToConsumer(sourceMap).eachMapping((m) => console.log(JSON.stringify(m)));

    expect(js).to.exist;
  });
});

function compile(sources: Map<string, string>): {js: string, sourceMap: string} {
  const program = testSupport.createProgram(sources, testSupport.compilerOptions);
  {  // Scope for the "diagnostics" variable so we can use the name again later.
    const diagnostics = ts.getPreEmitDiagnostics(program);
    if (diagnostics.length > 0) {
      console.error(tsickle.formatDiagnostics(diagnostics));
      assert.fail(`couldn't create the program`);
      throw new Error('unreachable');
    }
  }

  const customTransformers: ts.CustomTransformers = {
    before: [transformer(program.getTypeChecker())],
  };
  const jsFiles = new Map<string, string>();
  const {diagnostics} = program.emit(
      undefined, (fileName, content) => jsFiles.set(fileName, content), undefined, undefined,
      createCustomTransformers(customTransformers));
  if (diagnostics.length > 0) {
    console.error(tsickle.formatDiagnostics(diagnostics));
    assert.fail(`emit failed`);
    throw new Error('unreachable');
  }

  const js = getFileWithName('input.js', jsFiles) || '';
  const sourceMap = getFileWithName('input.js.map', jsFiles) || '';
  return {js, sourceMap};
}

function getFileWithName(filename: string, files: Map<string, string>): string|undefined {
  for (const filepath of files.keys()) {
    if (path.parse(filepath).base === path.parse(filename).base) {
      return files.get(filepath);
    }
  }
  return undefined;
}
