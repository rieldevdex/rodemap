/**
 * Extracts string content from TypeScript/TSX sources with the TypeScript
 * compiler API: string literals, template literals (parts joined with a
 * placeholder), JSX text and JSX attribute strings. Module specifiers
 * (`import … from '…'`, `import('…')`, `require('…')`) are skipped.
 */
import ts from 'typescript';

/** Stands in for `${…}` substitutions when template parts are joined. */
export const TEMPLATE_PLACEHOLDER = '${…}';

export type StringKind = 'string' | 'template' | 'jsx-text' | 'jsx-attribute';

export interface ExtractedString {
  kind: StringKind;
  /** Cooked text. Template literals are joined with TEMPLATE_PLACEHOLDER. */
  text: string;
  /** Source offset for every index of `text`, plus one sentinel entry for `text.length`. */
  offsets: number[];
  /** JSX attribute name when kind is 'jsx-attribute'. */
  attribute?: string;
  /** Property name when the string is the value of an object property (`{ href: '#x' }`). */
  propertyName?: string;
  /** Name of the called function/method when the string is a call argument (`querySelector('#x')` → 'querySelector'). */
  callee?: string;
  /** Property compared against with ===/!== (`location.hash === '#x'` → 'hash'). */
  comparedWith?: string;
}

function lastName(expr: ts.Expression): string | undefined {
  if (ts.isIdentifier(expr)) return expr.text;
  if (ts.isPropertyAccessExpression(expr)) return expr.name.text;
  return undefined;
}

/** Records where a literal is used, so rules can tell anchors/selectors from colors. */
function describeContext(node: ts.Node, piece: ExtractedString, sf: ts.SourceFile): void {
  const parent = node.parent as ts.Node | undefined;
  if (!parent) return;
  if (ts.isJsxAttribute(parent)) piece.attribute = parent.name.getText(sf);
  else if (ts.isJsxExpression(parent) && ts.isJsxAttribute(parent.parent)) piece.attribute = parent.parent.name.getText(sf);
  else if (ts.isPropertyAssignment(parent) && parent.initializer === node) {
    const name = parent.name;
    if (ts.isIdentifier(name) || ts.isStringLiteral(name)) piece.propertyName = name.text;
  } else if (ts.isCallExpression(parent) && parent.arguments.some((a) => a === node)) {
    const callee = lastName(parent.expression);
    if (callee !== undefined) piece.callee = callee;
  } else if (ts.isBinaryExpression(parent)) {
    const op = parent.operatorToken.kind;
    const equality = [
      ts.SyntaxKind.EqualsEqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsEqualsToken,
      ts.SyntaxKind.EqualsEqualsToken,
      ts.SyntaxKind.ExclamationEqualsToken,
    ].includes(op);
    const other = parent.left === node ? parent.right : parent.left;
    if (equality && ts.isPropertyAccessExpression(other)) piece.comparedWith = other.name.text;
  }
}

function scriptKindFor(fileName: string): ts.ScriptKind {
  if (fileName.endsWith('.tsx')) return ts.ScriptKind.TSX;
  if (fileName.endsWith('.jsx')) return ts.ScriptKind.JSX;
  if (fileName.endsWith('.js') || fileName.endsWith('.mjs') || fileName.endsWith('.cjs')) return ts.ScriptKind.JS;
  return ts.ScriptKind.TS;
}

function isModuleSpecifier(node: ts.Node): boolean {
  const parent = node.parent as ts.Node | undefined;
  if (!parent) return false;
  if ((ts.isImportDeclaration(parent) || ts.isExportDeclaration(parent)) && parent.moduleSpecifier === node) return true;
  if (ts.isExternalModuleReference(parent)) return true;
  if (ts.isModuleDeclaration(parent) && parent.name === node) return true;
  if (ts.isLiteralTypeNode(parent) && ts.isImportTypeNode(parent.parent)) return true;
  if (ts.isCallExpression(parent) && parent.arguments[0] === node) {
    const callee = parent.expression;
    if (callee.kind === ts.SyntaxKind.ImportKeyword) return true;
    if (ts.isIdentifier(callee) && callee.text === 'require') return true;
  }
  return false;
}

/** Appends `cooked` to the accumulator, mapping offsets 1:1 when the raw source matches. */
function appendPart(acc: { text: string; offsets: number[] }, cooked: string, raw: string, rawStart: number): void {
  const exact = cooked === raw;
  for (let i = 0; i < cooked.length; i++) {
    acc.text += cooked.charAt(i);
    acc.offsets.push(exact ? rawStart + i : rawStart);
  }
}

function appendPlaceholder(acc: { text: string; offsets: number[] }, at: number): void {
  for (let i = 0; i < TEMPLATE_PLACEHOLDER.length; i++) {
    acc.text += TEMPLATE_PLACEHOLDER.charAt(i);
    acc.offsets.push(at);
  }
}

/** Extracts every string-like piece of `source`. `fileName` selects TS vs TSX parsing. */
export function extractStrings(source: string, fileName: string): ExtractedString[] {
  const sf = ts.createSourceFile(fileName, source, ts.ScriptTarget.Latest, true, scriptKindFor(fileName));
  const out: ExtractedString[] = [];

  const literalPiece = (node: ts.StringLiteral | ts.NoSubstitutionTemplateLiteral, kind: StringKind): void => {
    const start = node.getStart(sf);
    const acc = { text: '', offsets: [] as number[] };
    appendPart(acc, node.text, source.slice(start + 1, node.end - 1), start + 1);
    acc.offsets.push(node.end - 1);
    const piece: ExtractedString = { kind, text: acc.text, offsets: acc.offsets };
    describeContext(node, piece, sf);
    out.push(piece);
  };

  const visit = (node: ts.Node): void => {
    if (ts.isStringLiteral(node)) {
      if (!isModuleSpecifier(node)) literalPiece(node, ts.isJsxAttribute(node.parent) ? 'jsx-attribute' : 'string');
      return;
    }
    if (ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isModuleSpecifier(node)) literalPiece(node, 'template');
      return;
    }
    if (ts.isTemplateExpression(node)) {
      const acc = { text: '', offsets: [] as number[] };
      const head = node.head;
      const headStart = head.getStart(sf);
      appendPart(acc, head.text, source.slice(headStart + 1, head.end - 2), headStart + 1);
      for (const span of node.templateSpans) {
        appendPlaceholder(acc, span.expression.getStart(sf));
        const lit = span.literal;
        const litStart = lit.getStart(sf);
        const closing = ts.isTemplateTail(lit) ? 1 : 2;
        appendPart(acc, lit.text, source.slice(litStart + 1, lit.end - closing), litStart + 1);
      }
      acc.offsets.push(node.end - 1);
      out.push({ kind: 'template', text: acc.text, offsets: acc.offsets });
      // Substitutions may contain further strings.
      for (const span of node.templateSpans) visit(span.expression);
      return;
    }
    if (ts.isJsxText(node)) {
      if (!node.containsOnlyTriviaWhiteSpaces) {
        const text = node.text;
        const offsets: number[] = [];
        for (let i = 0; i <= text.length; i++) offsets.push(node.pos + i);
        out.push({ kind: 'jsx-text', text, offsets });
      }
      return;
    }
    ts.forEachChild(node, visit);
  };

  visit(sf);
  return out;
}
