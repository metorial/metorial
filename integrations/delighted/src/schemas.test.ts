import { readFileSync } from 'node:fs';
import { describeMcpCompatibleToolSchemas } from '@slates/test';
import ts from 'typescript';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import contracts from './legacy-schema-contracts.json';
import { sunsetFaqUrl, unavailableMessage } from './lib/unavailable';
import { spec } from './spec';

// Compare schema tokens rather than formatting; snapshots are genuine pre-edit contracts.
function tokens(source: string): string[] {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    true,
    ts.LanguageVariant.Standard,
    source
  );
  const result: string[] = [];
  for (
    let kind = scanner.scan();
    kind !== ts.SyntaxKind.EndOfFileToken;
    kind = scanner.scan()
  ) {
    const value = [
      ts.SyntaxKind.Identifier,
      ts.SyntaxKind.StringLiteral,
      ts.SyntaxKind.NumericLiteral,
      ts.SyntaxKind.NoSubstitutionTemplateLiteral
    ].includes(kind)
      ? scanner.getTokenValue()
      : scanner.getTokenText();
    result.push(`${kind}:${value}`);
  }
  return result;
}

describeMcpCompatibleToolSchemas('Delighted retained object schemas', provider.actions);
describe('Delighted completed-shutdown contracts', () => {
  it('retains exactly twelve legacy actions and no replacement or triggers', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual(
      Object.keys(contracts).sort()
    );
    expect(provider.actions.every(action => action.type === 'tool')).toBe(true);
    expect(provider.triggerGroups).toHaveLength(0);
    expect(provider.actions.every(action => `delighted-${action.key}`.length < 60)).toBe(true);
    expect(spec.configSchema.parse({})).toEqual({});
  });

  for (const [key, contract] of Object.entries(contracts)) {
    it(`preserves ${key} schemas, name and original effect tags with deprecation guidance`, () => {
      const action = provider.actions.find(action => action.key === key);
      expect(action).toBeDefined();
      expect(action?.name).toBe(contract.name);
      expect(action?.tags).toMatchObject({ ...contract.tags, deprecated: true });
      expect(action?.description).toMatch(/^DEPRECATED — .*July 1, 2026/);
      expect(action?.instructions).toContain(unavailableMessage);
      expect(unavailableMessage).toContain(sunsetFaqUrl);

      const source = readFileSync(
        new URL(`./tools/${contract.file}`, import.meta.url),
        'utf8'
      );
      const helpers =
        (source.split('export let ')[0] ?? '')
          .match(/let \w+Schema = [\s\S]*?\n\}\);/g)
          ?.join('\n') ?? '';
      const block = source
        .split(/(?=export let \w+ = SlateTool.create)/)
        .find(part => part.includes(`key: '${key}'`));
      expect(block).toBeDefined();
      if (!block) return;
      const schema = block.slice(
        block.indexOf('  .input('),
        block.indexOf('  .handleInvocation(')
      );
      expect(tokens(`${helpers}\n${schema}`)).toEqual(tokens(contract.schemaSource));
    });
  }
});
