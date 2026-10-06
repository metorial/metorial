import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Slite input schemas', provider.actions);
const legacy = [
  'create_note',
  'get_note',
  'update_note',
  'delete_note',
  'search_notes',
  'ask_question',
  'manage_note_lifecycle',
  'update_tile',
  'list_notes',
  'find_user_or_group',
  'manage_custom_content',
  'audit_knowledge_base'
];
const action = (key: string) => provider.actions.find(a => a.key === key)!;
describe('Slite compatibility contracts', () => {
  it('preserves all twelve legacy keys with only the three approved additions', () =>
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...legacy, 'get_current_user', 'download_note', 'get_ask_thread'].sort()
    ));
  it('keeps production identifiers shorter than sixty characters', () => {
    for (const a of provider.actions) expect(`slite-${a.key}`.length).toBeLessThan(60);
  });
  it.each([
    'verify',
    'flag_outdated',
    'archive',
    'unarchive',
    'update_owner'
  ])('preserves lifecycle %s', value =>
    expect(
      action('manage_note_lifecycle').inputSchema.safeParse({ noteId: 'id', action: value })
        .success
    ).toBe(true));
  it.each(['index', 'list', 'delete'])('preserves custom index %s', value =>
    expect(
      action('manage_custom_content').inputSchema.safeParse({ rootId: 'root', action: value })
        .success
    ).toBe(true));
  it.each(['all', 'public', 'inactive', 'empty'])('preserves audit category %s', category =>
    expect(action('audit_knowledge_base').inputSchema.safeParse({ category }).success).toBe(
      true
    ));
  it('preserves nullable tile fields and permits documented missing/null color', () => {
    for (const status of [{ label: 'ready' }, { label: 'ready', colorHex: null }, null])
      expect(
        action('update_tile').inputSchema.safeParse({
          noteId: 'n',
          tileId: 't',
          title: null,
          iconURL: null,
          status,
          url: null,
          content: null
        }).success
      ).toBe(true);
  });
  it('preserves string attributes while adding native nullable positions and SliteML', () => {
    for (const key of ['create_note', 'update_note'])
      expect(
        action(key).inputSchema.safeParse({
          title: 'title',
          noteId: 'n',
          attributes: ['value', null],
          sliteml: ''
        }).success
      ).toBe(true);
  });
  it('preserves default note representation and child option', () =>
    expect(action('get_note').inputSchema.parse({ noteId: 'n' })).toMatchObject({
      format: 'md',
      includeChildren: false
    }));
  it('preserves user/group lookup variants', () => {
    for (const lookupType of ['user', 'group'])
      expect(
        action('find_user_or_group').inputSchema.safeParse({ lookupType, resourceId: 'id' })
          .success
      ).toBe(true);
  });
  it('represents async Ask without removing legacy answer/source fields', () =>
    expect(
      action('ask_question').outputSchema.safeParse({
        status: 'processing',
        threadId: 'thread',
        retryAfterSeconds: 1,
        answer: 'Pending',
        sources: []
      }).success
    ).toBe(true));
  it('does not invent authenticated user or organization IDs', () =>
    expect(
      action('get_current_user').outputSchema.parse({
        email: 'user@example.invalid',
        displayName: 'User',
        organizationName: 'Organization',
        organizationDomain: 'organization'
      })
    ).not.toHaveProperty('userId'));
  it('preserves read-only thread approval-needed state and citation IDs', () =>
    expect(
      action('get_ask_thread').outputSchema.safeParse({
        threadId: 't',
        status: 'needs-approval',
        rounds: [
          {
            question: 'q',
            answer: 'a',
            sources: [
              { id: 'citation-1', title: 'doc', url: 'https://example.invalid', updatedAt: '' }
            ]
          }
        ],
        triageUrl: 'https://example.invalid'
      }).success
    ).toBe(true));
});
