import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Storyblok input schemas', provider.actions);
const legacy = {
  manage_story: [
    'action',
    'storyId',
    'name',
    'slug',
    'content',
    'parentId',
    'isStartpage',
    'isFolder',
    'path',
    'language'
  ],
  list_stories: [
    'page',
    'perPage',
    'searchTerm',
    'sortBy',
    'withTag',
    'startsWith',
    'containComponent',
    'isPublished',
    'language',
    'byUuids'
  ],
  get_story: ['storyId'],
  manage_component: [
    'action',
    'componentId',
    'name',
    'displayName',
    'schema',
    'isRoot',
    'isNestable',
    'componentGroupUuid',
    'color',
    'icon'
  ],
  list_components: [],
  manage_asset: [
    'action',
    'assetId',
    'name',
    'alt',
    'title',
    'copyright',
    'focus',
    'assetFolderId',
    'isPrivate'
  ],
  list_assets: ['page', 'perPage', 'search', 'inFolder', 'isPrivate'],
  manage_datasource: ['action', 'datasourceId', 'name', 'slug'],
  manage_datasource_entry: [
    'action',
    'datasourceId',
    'entryId',
    'name',
    'value',
    'dimensionValue',
    'page',
    'perPage'
  ],
  manage_collaborator: ['action', 'collaboratorId', 'email', 'spaceRoleId'],
  manage_release: ['action', 'releaseId', 'name', 'releaseAt', 'timezone'],
  get_space_info: [],
  list_activities: ['page', 'perPage']
};
for (const [key, fields] of Object.entries(legacy))
  it(`${key} retains legacy input fields`, () => {
    const action = provider.actions.find(a => a.type === 'tool' && a.key === key);
    expect(action).toBeDefined();
    if (!action || action.type !== 'tool') return;
    const json = z.toJSONSchema(action.inputSchema);
    for (const field of fields) expect(json.properties).toHaveProperty(field);
    expect(`storyblok-${key}`.length).toBeLessThan(60);
  });
it('registers the approved 15 tools with no triggers', () => {
  expect(provider.actions.filter(a => a.type === 'tool')).toHaveLength(15);
  expect(provider.actions.some(a => a.type === 'trigger')).toBe(false);
});
