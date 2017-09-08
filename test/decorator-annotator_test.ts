/**
 * @license
 * Copyright Google Inc. All Rights Reserved.
 *
 * Use of this source code is governed by an MIT-style license that can be
 * found in the LICENSE file at https://angular.io/license
 */

// tslint:disable:no-unused-expression mocha .to.be.empty getters.

import {expect} from 'chai';
import {SourceMapConsumer} from 'source-map';
import * as ts from 'typescript';

import * as cliSupport from '../src/cli_support';
import {convertDecorators} from '../src/decorator-annotator';
import {DefaultSourceMapper} from '../src/source_map_utils';
import * as tsickle from '../src/tsickle';

import {createAstPrintingTransform} from './ast_printing_transform';
import {compilerOptions, createProgram, createProgramAndHost} from './test_support';

const testCaseFileName = 'testcase.ts';

function sources(sourceText: string): Map<string, string> {
  const sources = new Map<string, string>([
    [testCaseFileName, sourceText],
    // Provides a rename of any 'FakeDecorator' that we can use as an annotator
    // without the compiler complaining we didn't actually provide a value
    ['bar.d.ts', `declare module "bar" {
      export class BarService {}
      type FakeDecorator = any;
    }`]
  ]);
  return sources;
}

describe.only('decorator-annotator', () => {
  function translate(sourceText: string, allowErrors = false) {
    const {host, program} = createProgramAndHost(sources(sourceText), compilerOptions);
    if (!allowErrors) {
      const diagnostics = ts.getPreEmitDiagnostics(program);
      expect(diagnostics, tsickle.formatDiagnostics(ts.getPreEmitDiagnostics(program))).to.be.empty;
    }

    const transformerHost: tsickle.TsickleHost = {
      shouldSkipTsickleProcessing: (filePath) => !sources(sourceText).has(filePath),
      pathToModuleName: cliSupport.pathToModuleName,
      shouldIgnoreWarningsForPath: (filePath) => false,
      fileNameToModuleId: (filePath) => filePath,
      transformDecorators: true,
      googmodule: true,
      es5Mode: false,
      untyped: false,
    };

    const files = new Map<string, string>();
    const {diagnostics} = tsickle.emitWithTsickle(
        program, transformerHost, host, compilerOptions, undefined, (path, contents) => {},
        undefined, undefined, {beforeTs: [createAstPrintingTransform(files)]});

    if (!allowErrors) {
      // tslint:disable-next-line:no-unused-expression
      expect(diagnostics, tsickle.formatDiagnostics(diagnostics)).to.be.empty;
    }

    return {output: files.get(testCaseFileName)!, diagnostics};
  }

  function prettyPrint(sourceText: string) {
    return ts.createPrinter().printFile(
        ts.createSourceFile('', sourceText, compilerOptions.target!));
  }

  function normalizeQuotes(sourceText: string) {
    return sourceText.replace(/"/g, `'`);
  }

  function expectUnchanged(sourceText: string) {
    expectTranslatedToEqual(sourceText, sourceText);
  }

  function expectTranslatedToEqual(sourceText: string, expected: string) {
    expect(normalizeQuotes(translate(sourceText).output))
        .to.equal(normalizeQuotes(prettyPrint(expected)));
  }

  describe('class decorator rewriter', () => {
    it('leaves plain classes alone', () => {
      expectUnchanged(`class Foo {}`);
    });

    it('leaves un-marked decorators alone', () => {
      expectUnchanged(`
          let Decor: any;
          @Decor class Foo {
            constructor(@Decor p: number) {}
            @Decor m(): void {}
          }`);
    });

    it('transforms decorated classes', () => {
      expectTranslatedToEqual(`
import {FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;
/** @Annotation */ let Test2: FakeDecorator;
let param: any;
@Test1
@Test2(param)
class Foo {
  field: string;
}`, `
import {FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;
/** @Annotation */ let Test2: FakeDecorator;
let param: any;


class Foo {
  field: string;
static decorators: {type: Function, args?: any[]}[] = [
{ type: Test1 },
{ type: Test2, args: [param, ] },
];
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
];
}`);
    });

    it('transforms decorated classes with function expression annotation declaration', () => {
      expectTranslatedToEqual(`
/** @Annotation */ function Test(t: any) {};
@Test
class Foo {
  field: string;
}`, `
/** @Annotation */ function Test(t: any) {};

class Foo {
  field: string;
static decorators: {type: Function, args?: any[]}[] = [
{ type: Test },
];
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
];
}`);
    });

    it('transforms decorated classes with an exported annotation declaration', () => {
      expectTranslatedToEqual(`
import {FakeDecorator} from 'bar';
/** @Annotation */ export let Test: FakeDecorator;
@Test
class Foo {
  field: string;
}`, `
import {FakeDecorator} from 'bar';
/** @Annotation */ export let Test: FakeDecorator;

class Foo {
  field: string;
static decorators: {type: Function, args?: any[]}[] = [
{ type: Test },
];
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
];
}`);
    });

    it('accepts various complicated decorators', () => {
      expectTranslatedToEqual(`
import {FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;
/** @Annotation */ let Test2: FakeDecorator;
/** @Annotation */ let Test3: FakeDecorator;
/** @Annotation */ function Test4<T>(param: any): ClassDecorator { return null as any; }
let param: any;
@Test1({name: 'percentPipe'}, class ZZZ {})
@Test2
@Test3()
@Test4<string>(param)
class Foo {
}`, `
import {FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;
/** @Annotation */ let Test2: FakeDecorator;
/** @Annotation */ let Test3: FakeDecorator;
/** @Annotation */ function Test4<T>(param: any): ClassDecorator { return null as any; }
let param: any;




class Foo {
static decorators: {type: Function, args?: any[]}[] = [
{ type: Test1, args: [{name: 'percentPipe'}, class ZZZ {}, ] },
{ type: Test2 },
{ type: Test3 },
{ type: Test4, args: [param, ] },
];
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
];
}`);
    });

    it(`doesn't eat 'export'`, () => {
      expectTranslatedToEqual(`
import {FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;
@Test1
export class Foo {
}`, `
import {FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;

export class Foo {
static decorators: {type: Function, args?: any[]}[] = [
{ type: Test1 },
];
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
];
}`);
    });

    it(`handles nested classes`, () => {
      expectTranslatedToEqual(`
import {FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;
/** @Annotation */ let Test2: FakeDecorator;
@Test1
export class Foo {
  foo() {
    @Test2
    class Bar {
    }
  }
}`, `
import {FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;
/** @Annotation */ let Test2: FakeDecorator;

export class Foo {
  foo() {
    \n    class Bar {
    static decorators: {type: Function, args?: any[]}[] = [
{ type: Test2 },
];
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
];
}
  }
static decorators: {type: Function, args?: any[]}[] = [
{ type: Test1 },
];
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
];
}`);
    });
  });

  describe('ctor decorator rewriter', () => {
    it('ignores ctors that have no applicable injects', () => {
      expectUnchanged(`
import {BarService} from 'bar';
class Foo {
  constructor(bar: BarService, num: number) {
  }
}`);
    });

    it('transforms injected ctors', () => {
      expectTranslatedToEqual(`
/** @Annotation */ let Inject: Function;
enum AnEnum { ONE, TWO, };
abstract class AbstractService {}
class Foo {
  constructor(@Inject bar: AbstractService, @Inject('enum') num: AnEnum) {
  }
}`, `
/** @Annotation */ let Inject: Function;
enum AnEnum { ONE, TWO, };
abstract class AbstractService {}
class Foo {
  constructor( bar: AbstractService,  num: AnEnum) {
  }
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
{type: AbstractService, decorators: [{ type: Inject }, ]},
{type: AnEnum, decorators: [{ type: Inject, args: ['enum', ] }, ]},
];
}`);
    });

    it('stores non annotated parameters if the class has at least one decorator', () => {
      expectTranslatedToEqual(`
import {BarService, FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;
@Test1()
class Foo {
  constructor(bar: BarService, num: number) {
  }
}`, `
import {BarService, FakeDecorator} from 'bar';
/** @Annotation */ let Test1: FakeDecorator;

class Foo {
  constructor(bar: BarService, num: number) {
  }
static decorators: {type: Function, args?: any[]}[] = [
{ type: Test1 },
];
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
{type: BarService, },
null,
];
}`);
    });

    it('handles complex ctor parameters', () => {
      expectTranslatedToEqual(`
import * as bar from 'bar';
/** @Annotation */ let Inject: Function;
let param: any;
class Foo {
  constructor(@Inject(param) x: bar.BarService, {a, b}, defArg = 3, optional?: bar.BarService) {
  }
}`, `
import * as bar from 'bar';
/** @Annotation */ let Inject: Function;
let param: any;
class Foo {
  constructor( x: bar.BarService, {a, b}, defArg = 3, optional?: bar.BarService) {
  }
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
{type: bar.BarService, decorators: [{ type: Inject, args: [param, ] }, ]},
null,
null,
{type: bar.BarService, },
];
}`);
    });

    it('includes decorators for primitive type ctor parameters', () => {
      expectTranslatedToEqual(`
/** @Annotation */ let Inject: Function;
let APP_ID: any;
class ViewUtils {
  constructor(@Inject(APP_ID) private _appId: string) {}
}`, `
/** @Annotation */ let Inject: Function;
let APP_ID: any;
class ViewUtils {
  constructor( private _appId: string) {}
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
{type: undefined, decorators: [{ type: Inject, args: [APP_ID, ] }, ]},
];
}`);
    });

    it('strips generic type arguments', () => {
      expectTranslatedToEqual(`
/** @Annotation */ let Inject: Function;
class Foo {
  constructor(@Inject typed: Promise<string>) {
  }
}`, `
/** @Annotation */ let Inject: Function;
class Foo {
  constructor( typed: Promise<string>) {
  }
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
{type: Promise, decorators: [{ type: Inject }, ]},
];
}`);
    });

    it('avoids using interfaces as values', () => {
      expectTranslatedToEqual(`
/** @Annotation */ let Inject: Function = (null as any);
class Class {}
interface Iface {}
class Foo {
  constructor(@Inject aClass: Class, @Inject aIface: Iface) {}
}`, `
/** @Annotation */ let Inject: Function = (null as any);
class Class {}
interface Iface {}
class Foo {
  constructor( aClass: Class,  aIface: Iface) {}
/** @nocollapse */
static ctorParameters: () => ({type: any, decorators?: {type: Function, args?: any[]}[]}|null)[] = () => [
{type: Class, decorators: [{ type: Inject }, ]},
{type: undefined, decorators: [{ type: Inject }, ]},
];
}`);
    });
  });

  describe('method decorator rewriter', () => {
    it('leaves ordinary methods alone', () => {
      expectUnchanged(`
class Foo {
  bar() {}
}`);
    });

    it('gathers decorators from methods', () => {
      expectTranslatedToEqual(`
/** @Annotation */ let Test1: Function;
class Foo {
  @Test1('somename')
  bar() {}
}`, `
/** @Annotation */ let Test1: Function;
class Foo {
  \n  bar() {}
static propDecorators: {[key: string]: {type: Function, args?: any[]}[]} = {
"bar": [{ type: Test1, args: ['somename', ] },],
};
}`);
    });

    it('gathers decorators from fields and setters', () => {
      expectTranslatedToEqual(`
/** @Annotation */ let PropDecorator: Function;
class ClassWithDecorators {
  @PropDecorator("p1") @PropDecorator("p2") a;
  b;

  @PropDecorator("p3")
  set c(value) {}
}`, `
/** @Annotation */ let PropDecorator: Function;
class ClassWithDecorators {
    a;
  b;

  \n  set c(value) {}
static propDecorators: {[key: string]: {type: Function, args?: any[]}[]} = {
"a": [{ type: PropDecorator, args: ["p1", ] },{ type: PropDecorator, args: ["p2", ] },],
"c": [{ type: PropDecorator, args: ["p3", ] },],
};
}`);
    });

    it('errors on weird class members', () => {
      const {diagnostics} = translate(`
/** @Annotation */ let Test1: Function;
let param: any;
class Foo {
  @Test1('somename')
  [param]() {}
}`, true /* allow errors */);

      expect(tsickle.formatDiagnostics(diagnostics))
          .to.equal(
              'Error at testcase.ts:5:3: cannot process decorators on strangely named method');
    });
    it('avoids mangling code relying on ASI', () => {
      expectTranslatedToEqual(`
/** @Annotation */ let PropDecorator: Function;
class Foo {
  missingSemi = () => {}
  @PropDecorator other: number;
}`, `
/** @Annotation */ let PropDecorator: Function;
class Foo {
  missingSemi = () => {}
   other: number;
static propDecorators: {[key: string]: {type: Function, args?: any[]}[]} = {
"other": [{ type: PropDecorator },],
};
}`);

    });
  });
});
