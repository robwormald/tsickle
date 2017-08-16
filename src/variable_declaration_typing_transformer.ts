import * as ts from 'typescript';

export function transformer(context: ts.TransformationContext): ts.Transformer<ts.SourceFile> {
  const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
    switch (node.kind) {
      case ts.SyntaxKind.ClassDeclaration:
        const cd = node as ts.ClassDeclaration;
        const decorators = cd.decorators!;
        const modifier: ts.Modifier[] = [ts.createToken(ts.SyntaxKind.StaticKeyword)];
        const type = ts.createArrayTypeNode(ts.createTypeLiteralNode([]));
        const initializer = ts.createArrayLiteral([ts.createObjectLiteral([ts.createPropertyAssignment('type', decorators[0].expression)])], true);
        const decoratorMetadata = ts.createProperty(undefined, modifier, 'decorators', undefined, type, initializer);
        const blah = ts.getMutableClone(cd);
        blah.decorators = undefined;
        blah.members.push(decoratorMetadata);
        return blah;
      default:
        return ts.visitEachChild(node, visitor, context);
    }
  };

  const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) =>
      ts.visitNode(sf, visitor);

  return transformer;
}
