import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Cloudinary input schemas', provider.actions);
describe('Cloudinary compatible public contracts', () => {
  it('retains nine legacy keys and the two approved additions', () => {
    expect(provider.actions.map(action => action.key).sort()).toEqual([
      'delete_assets',
      'download_asset',
      'get_asset',
      'get_environment_context',
      'get_usage',
      'list_assets',
      'manage_folders',
      'manage_tags',
      'search_assets',
      'update_asset',
      'upload_asset'
    ]);
    for (const action of provider.actions)
      expect(`cloudinary-${action.key}`.length).toBeLessThan(60);
  });
  for (const [key, inputs] of [
    [
      'get_asset',
      [
        { assetId: 'asset' },
        { publicId: 'path/asset' },
        { publicId: 'asset', type: 'private' }
      ]
    ],
    ['delete_assets', [{ publicIds: ['asset'] }, { prefix: 'owned/' }, { tag: 'owned' }]],
    [
      'manage_folders',
      ['list', 'create', 'delete'].map(action => ({ action, path: 'owned' }))
    ],
    [
      'manage_tags',
      ['add', 'remove', 'replace', 'set_exclusive', 'remove_all'].map(command => ({
        command,
        tag: 'owned',
        publicIds: ['asset']
      }))
    ],
    [
      'upload_asset',
      [
        { file: 'https://example.invalid/file', resourceType: 'auto' },
        { file: 'data:image/png;base64,AA==', folder: 'owned', overwrite: false }
      ]
    ],
    [
      'update_asset',
      [
        { publicId: 'asset', newPublicId: 'other', overwriteOnRename: false },
        { publicId: 'asset', tags: [], context: { arbitrary_key: 'value' } }
      ]
    ],
    [
      'list_assets',
      [{ maxResults: 1, nextCursor: 'opaque', includeTags: false, includeContext: true }]
    ],
    [
      'search_assets',
      [
        {
          sortBy: [{ field: 'created_at', direction: 'desc' }],
          withField: ['context'],
          aggregate: ['format']
        }
      ]
    ],
    ['get_usage', [{}, { date: '2026-10-01' }]]
  ] as const)
    it(`preserves ${key} legacy field types and branches`, () => {
      const action = provider.actions.find(action => action.key === key)!;
      for (const input of inputs)
        expect(action.inputSchema.safeParse(input).success).toBe(true);
    });
});
