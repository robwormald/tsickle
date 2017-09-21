export declare class Foo {
  grandParentMethod(n: number): number;
}
declare namespace ಠ_ಠ.clutz {
  class module$contents$google3$javascript$typescript$compiler$test$_canary$ts_js_ts_chain$grandparent_Foo extends module$contents$google3$javascript$typescript$compiler$test$_canary$ts_js_ts_chain$grandparent_Foo_Instance {
  }
  class module$contents$google3$javascript$typescript$compiler$test$_canary$ts_js_ts_chain$grandparent_Foo_Instance {
    private noStructuralTyping_: any;
    grandParentMethod (n : any ) : any ;
  }
}


// Original .d.ts produced from TS code.
export declare function tsFn();
export declare class TsClass { x: number; }

namespace ___aliases {
// alias needed to avoid circular ref.
const tsFnAlias = tsFn;
// classes need special care to recreate both type and value.
type TsClassAlias = TsClass;
const TsClassAlias: typeof TsClass;
}

// Declarations below are created by tsickle
// Re-open the global namespace to expose Clutz types:
declare global {
namespace ಠ_ಠ.clutz.google3.type.script.code {
 const tsFn = ___aliases.tsFnAlias;
 type TsClass = ___aliases.TsClassAlias;
 const TsClass: typeof ___aliases.TsClassAlias;
}
}
