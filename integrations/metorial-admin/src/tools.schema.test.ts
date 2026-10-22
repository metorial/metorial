import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Metorial Admin tool input schemas', provider.actions);

describe('generated admin contract', () => {
  let toolKeys = provider.actions
    .filter(action => action.type === 'tool')
    .map(action => action.key);

  it('keeps every tool id under 60 characters because generated keys change without per-tool review', () => {
    for (let key of toolKeys) expect(`metorial-admin-${key}`.length).toBeLessThan(60);
  });

  it('never lets a generated key shadow another tool because generated keys change without per-tool review', () => {
    let duplicates = toolKeys.filter((key, index) => toolKeys.indexOf(key) !== index);
    expect(duplicates).toEqual([]);
  });

  it('deprecates the legacy instance tools in favor of the generated ones', () => {
    for (let [legacy, replacement] of [
      ['list_instances', 'instance_list'],
      ['get_instance', 'instance_get']
    ]) {
      expect(toolKeys).toContain(replacement);
      let action = provider.actions.find(item => item.key === legacy);
      expect(action?.tags).toMatchObject({ deprecated: true });
    }
  });
});
