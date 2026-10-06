import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { config } from './config';
import { provider } from './index';

const legacy = [
  'search_entries',
  'get_entry',
  'create_entry',
  'update_entry',
  'manage_entry_lifecycle',
  'search_assets',
  'get_asset',
  'create_asset',
  'manage_asset_lifecycle',
  'list_content_types',
  'manage_content_type',
  'manage_tags',
  'list_locales',
  'list_environments',
  'sync_content',
  'schedule_action',
  'manage_release'
];
const action = (key: string) => provider.actions.find(a => a.key === key)!;
describeMcpCompatibleToolSchemas('Contentful input schemas', provider.actions);
describe('Contentful compatibility contracts', () => {
  it('preserves seventeen legacy keys and adds only the three approved capabilities', () =>
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...legacy, 'get_current_user', 'list_spaces', 'download_asset'].sort()
    ));
  it('keeps production IDs below sixty characters', () => {
    for (let a of provider.actions) expect(`contentful-${a.key}`.length).toBeLessThan(60);
  });
  it('does not require an opaque default space', () =>
    expect(config.configSchema.safeParse({}).success).toBe(true));
  it.each([
    'publish',
    'unpublish',
    'archive',
    'unarchive',
    'delete'
  ])('preserves %s for entries and assets', value => {
    for (let key of ['manage_entry_lifecycle', 'manage_asset_lifecycle'])
      expect(
        action(key).inputSchema.safeParse({
          entryId: 'entry',
          assetId: 'asset',
          action: value
        }).success
      ).toBe(true);
  });
  it.each([
    'create',
    'update',
    'activate',
    'deactivate',
    'delete'
  ])('preserves content type action %s', value =>
    expect(
      action('manage_content_type').inputSchema.safeParse({ action: value }).success
    ).toBe(true));
  it.each(['list', 'create', 'update', 'delete'])('preserves tag action %s', value =>
    expect(action('manage_tags').inputSchema.safeParse({ action: value }).success).toBe(true));
  it.each(['schedule', 'list', 'cancel'])('preserves scheduling action %s', value =>
    expect(action('schedule_action').inputSchema.safeParse({ action: value }).success).toBe(
      true
    ));
  it.each([
    'list',
    'get',
    'create',
    'publish',
    'unpublish',
    'delete'
  ])('preserves release action %s', value =>
    expect(action('manage_release').inputSchema.safeParse({ action: value }).success).toBe(
      true
    ));
  it('retains legacy release description field with explicit unsupported guidance', () =>
    expect(
      action('manage_release').inputSchema.safeParse({
        action: 'create',
        description: 'legacy',
        title: 't',
        entities: [{ entityId: 'e', entityType: 'Entry' }]
      }).success
    ).toBe(true));
  it('preserves localized create fields and publish options', () =>
    expect(
      action('create_entry').inputSchema.safeParse({
        contentTypeId: 'ct',
        fields: { title: { 'en-US': 'title' } },
        publish: true
      }).success
    ).toBe(true));
  it('keeps valid zero native version and offset while rejecting invalid paging', () => {
    expect(
      action('update_entry').inputSchema.safeParse({
        entryId: 'entry',
        fields: {},
        version: 0
      }).success
    ).toBe(true);
    for (let limit of [0, 1001, 1.2])
      expect(action('search_entries').inputSchema.safeParse({ limit }).success).toBe(false);
    expect(
      action('search_entries').inputSchema.safeParse({ skip: 0, limit: 1000 }).success
    ).toBe(true);
  });
  it('preserves pending asset fields and async release recovery fields', () => {
    expect(
      action('create_asset').outputSchema.safeParse({
        assetId: 'a',
        version: 1,
        processed: false,
        published: false
      }).success
    ).toBe(true);
    expect(
      action('manage_release').outputSchema.safeParse({
        action: 'publish',
        releaseId: 'r',
        releaseActionId: 'action',
        status: 'created'
      }).success
    ).toBe(true);
  });
  it('preserves legacy sync URL and distinguishes current page from delta token', () =>
    expect(
      action('sync_content').outputSchema.safeParse({
        items: [],
        nextSyncUrl:
          'https://cdn.contentful.com/spaces/s/environments/master/sync?sync_token=t',
        nextPageToken: 't',
        hasMore: true
      }).success
    ).toBe(true));
  it('keeps environment selection at the content-type tool boundary', () => {
    const parsed = action('manage_content_type').inputSchema.parse({
      action: 'create',
      spaceId: 's',
      environmentId: 'e',
      name: 'N',
      fields: [{ fieldId: 'title', name: 'Title', type: 'Symbol' }]
    });
    expect(parsed.spaceId).toBe('s');
    expect(parsed.environmentId).toBe('e');
  });
  it('requires exact locale for file downloads', () =>
    expect(action('download_asset').inputSchema.safeParse({ assetId: 'a' }).success).toBe(
      false
    ));
});
