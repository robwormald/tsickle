import * as ts from 'typescript';

import { DecoratorClassVisitor } from './decorator-annotator';

function createClassDecoratorType() {
  const typeElements: ts.TypeElement[] = [];
  typeElements.push(ts.createPropertySignature(undefined, 'type', undefined, ts.createTypeReferenceNode(ts.createIdentifier('Function'), undefined), undefined));
  typeElements.push(ts.createPropertySignature(undefined, 'args', ts.createToken(ts.SyntaxKind.QuestionToken), ts.createArrayTypeNode(ts.createKeywordTypeNode(ts.SyntaxKind.AnyKeyword)), undefined));
  return ts.createArrayTypeNode(ts.createTypeLiteralNode(typeElements));
}

// function emitDecorator(decorator: ts.Decorator) {
//   this.rewriter.emit('{ type: ');
//   const expr = decorator.expression;
//   switch (expr.kind) {
//     case ts.SyntaxKind.Identifier:
//       // The decorator was a plain @Foo.
//       this.rewriter.visit(expr);
//       break;
//     case ts.SyntaxKind.CallExpression:
//       // The decorator was a call, like @Foo(bar).
//       const call = expr as ts.CallExpression;
//       this.rewriter.visit(call.expression);
//       if (call.arguments.length) {
//         this.rewriter.emit(', args: [');
//         for (const arg of call.arguments) {
//           this.rewriter.writeNodeFrom(arg, arg.getStart());
//           this.rewriter.emit(', ');
//         }
//         this.rewriter.emit(']');
//       }
//       break;
//     default:
//       this.rewriter.errorUnimplementedKind(expr, 'gathering metadata');
//       this.rewriter.emit('undefined');
//   }
//   this.rewriter.emit(' }');
// }

function extractDecoratorMetadata(decorator: ts.Decorator) {
  const metadataProperties: ts.ObjectLiteralElementLike[] = [];
  const expr = decorator.expression;
  switch(expr.kind) {
    case ts.SyntaxKind.Identifier:
      // The decorator was a plain @Foo.
      metadataProperties.push(ts.createPropertyAssignment('type', expr));
      break;
    case ts.SyntaxKind.CallExpression:
      // The decorator was a call, like @Foo(bar).
      const call = expr as ts.CallExpression;
      metadataProperties.push(ts.createPropertyAssignment('type', call.expression));
      if (call.arguments.length) {
        const args: ts.Expression[] = [];
        for (const arg of call.arguments) {
          args.push(arg);
        }
        const argsArrayLiteral = ts.createArrayLiteral(args);
        argsArrayLiteral.elements.hasTrailingComma = true;
        metadataProperties.push(ts.createPropertyAssignment('args', argsArrayLiteral));
      }
      break;
    default:
      throw new Error(`Unimplemented kind: ${ts.SyntaxKind[expr.kind]}`);
  }
  return ts.createObjectLiteral(metadataProperties);
}

export function transformer(typeChecker: ts.TypeChecker): (context: ts.TransformationContext) => ts.Transformer<ts.SourceFile> {
  return (context: ts.TransformationContext) => {
    const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
      switch (node.kind) {
        case ts.SyntaxKind.ClassDeclaration:
          const cd = node as ts.ClassDeclaration;
          const decorators = cd.decorators;
          if (decorators && decorators.length > 0) {
            const modifier = ts.createToken(ts.SyntaxKind.StaticKeyword);
            const type = createClassDecoratorType();
            const decoratorList = [];
            for (const decorator of decorators) {
              if (DecoratorClassVisitor.shouldLower(decorator, typeChecker)) {
                decoratorList.push(extractDecoratorMetadata(decorator));
              }
            }

            if (decoratorList.length === 0) {
              return node;
            }
            const initializer = ts.createArrayLiteral(decoratorList, true);
            initializer.elements.hasTrailingComma = true;
            const decoratorMetadata = ts.createProperty(
              undefined, [modifier], 'decorators', undefined, type, initializer);
            const newClassDeclaration = ts.getMutableClone(ts.visitEachChild(cd, visitor, context));
            newClassDeclaration.decorators = undefined;
            newClassDeclaration.members.push(decoratorMetadata);
            return newClassDeclaration;
          } else {
            return ts.visitEachChild(cd, visitor, context);
          }
        default:
          return ts.visitEachChild(node, visitor, context);
      }
    };

    const transformer: ts.Transformer<ts.SourceFile> = (sf: ts.SourceFile) =>
      ts.visitNode(sf, visitor);

    return transformer;
  };
}
