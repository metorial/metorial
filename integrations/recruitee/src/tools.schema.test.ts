import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Recruitee input schemas', provider.actions);
const legacyKeys = [
  'create_candidate',
  'get_candidate',
  'update_candidate',
  'delete_candidate',
  'search_candidates',
  'manage_candidate_notes',
  'manage_candidate_tags',
  'set_candidate_custom_fields',
  'create_offer',
  'get_offer',
  'update_offer',
  'list_offers',
  'manage_pipeline',
  'list_departments_locations',
  'list_disqualify_reasons'
];
describe('Recruitee public compatibility', () => {
  it('retains all legacy keys and only the three approved public additions', () => {
    const keys = provider.actions.map(action => action.key);
    for (const key of legacyKeys) expect(keys).toContain(key);
    expect(keys).toHaveLength(18);
    for (const key of ['get_current_identity', 'delete_offer', 'download_candidate_file'])
      expect(keys).toContain(key);
  });
  it('keeps production identifiers below sixty characters', () => {
    for (const action of provider.actions)
      expect(`recruitee-${action.key}`.length).toBeLessThan(60);
  });
  it('preserves legacy and new lifecycle enum branches', () => {
    const pipeline = provider.actions.find(action => action.key === 'manage_pipeline')!;
    for (const action of ['change_stage', 'disqualify', 'remove', 'assign', 'requalify'])
      expect(pipeline.inputSchema.safeParse({ action, placementId: 1 }).success).toBe(true);
    const tags = provider.actions.find(action => action.key === 'manage_candidate_tags')!;
    for (const action of ['list_tags', 'add_to_candidate', 'remove_from_candidate'])
      expect(tags.inputSchema.safeParse({ action }).success).toBe(true);
    const notes = provider.actions.find(action => action.key === 'manage_candidate_notes')!;
    for (const visibility of ['public', 'private'])
      expect(
        notes.inputSchema.safeParse({ action: 'create', candidateId: 1, visibility }).success
      ).toBe(true);
  });
  it('preserves numeric identifiers and pagination inputs', () => {
    const get = provider.actions.find(action => action.key === 'get_candidate')!;
    expect(get.inputSchema.safeParse({ candidateId: 1 }).success).toBe(true);
    expect(get.inputSchema.safeParse({ candidateId: '1' }).success).toBe(false);
    const search = provider.actions.find(action => action.key === 'search_candidates')!;
    expect(search.inputSchema.safeParse({ limit: 1, page: 1 }).success).toBe(true);
    expect(search.inputSchema.safeParse({ limit: '1' }).success).toBe(false);
  });
});
