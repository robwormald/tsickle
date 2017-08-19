import * as ts from 'typescript';

export function transformer(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        const cd = node as ts.ClassDeclaration;
        const decorators = cd.decorators;
        if (decorators && decorators.length > 0) {
          const modifier = ts.createToken(ts.SyntaxKind.StaticKeyword);
          ts.setOriginalNode(modifier, decorators[0]);
          ts.setSourceMapRange(modifier, decorators[0]);
          const type = ts.createArrayTypeNode(ts.createTypeLiteralNode([]));
          const decoratorList = [];
          for (const decorator of decorators) {
            const thingy = ts.createPropertyAssignment('type', decorator.expression);
            ts.setOriginalNode(thingy, decorator);
            ts.setSourceMapRange(thingy, decorator);
            const frobtr = ts.createObjectLiteral([thingy]);
            ts.setOriginalNode(frobtr, decorator);
            ts.setSourceMapRange(frobtr, decorator);
            decoratorList.push(frobtr);
          }
          const initializer = ts.createArrayLiteral(decoratorList, true);
          ts.setOriginalNode(initializer, decorators[0]);
          ts.setSourceMapRange(initializer, decorators[0]);
          const decoratorMetadata = ts.createProperty(undefined, [modifier], 'decorators', undefined, undefined, initializer);
          ts.setOriginalNode(decoratorMetadata, decorators[0]);
          ts.setSourceMapRange(decoratorMetadata, decorators[0]);
          const newClassDeclaration = ts.getMutableClone(cd);
          newClassDeclaration.decorators = undefined;
          newClassDeclaration.members.push(decoratorMetadata);
          return newClassDeclaration;
        }
        else {
          return cd;
        }
      default:
        return ts.visitEachChild(node, visitor, context);
    }
  };

  const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) =>
      ts.visitNode(sf, visitor);

  return transformer;
}
