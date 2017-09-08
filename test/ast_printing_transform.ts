import * as ts from 'typescript';

/**
 * Creates a transformer that captures the state of the AST as pretty printed
 * TypeScript in the provided 'files' map.
 */
export function createAstPrintingTransform(files: Map<string, string>) {
  return (context: ts.TransformationContext): ts.Transformer<ts.SourceFile> => {
    const visitor: ts.Visitor = (node: ts.Node): ts.Node => {
      switch (node.kind) {
        case ts.SyntaxKind.SourceFile:
          const sf = node as ts.SourceFile;
          files.set(sf.fileName, ts.createPrinter().printFile(sf));
          return sf;
        default:
          return ts.visitEachChild(node, visitor, context);
      }
    };

    return (sf: ts.SourceFile) => ts.visitNode(sf, visitor);
  };
}