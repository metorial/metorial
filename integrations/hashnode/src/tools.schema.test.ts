import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { config } from './config';
import { provider, z } from './index';
import legacySchemas from './legacy-schemas.json';

const legacy = [
  'get_post',
  'list_posts',
  'publish_post',
  'update_post',
  'delete_post',
  'manage_draft',
  'get_publication',
  'manage_series',
  'manage_comments',
  'get_user',
  'search_posts',
  'list_static_pages',
  'subscribe_newsletter'
];
const action = (key: string) => provider.actions.find(item => item.key === key)!;
describeMcpCompatibleToolSchemas('Hashnode tool inputs', provider.actions);
describe('Hashnode compatibility and deprecation contracts', () => {
  it('retains all thirteen legacy keys and only adds owned-publication discovery', () =>
    expect(provider.actions.map(item => item.key).sort()).toEqual(
      [...legacy, 'list_publications'].sort()
    ));
  it('keeps every public tool ID below sixty characters', () => {
    for (const item of provider.actions)
      expect(`hashnode-${item.key}`.length).toBeLessThan(60);
  });
  it('preserves a parsed saved hostname while allowing identity without a publication', () => {
    expect(config.configSchema.parse({ publicationHost: 'blog.hashnode.dev' })).toEqual({
      publicationHost: 'blog.hashnode.dev'
    });
    expect(config.configSchema.parse({})).toEqual({});
    expect(
      config.configSchema.safeParse({ publicationHost: 'https://blog.hashnode.dev/x' }).success
    ).toBe(false);
  });
  it.each([
    'create',
    'get',
    'list',
    'update',
    'delete'
  ])('retains series action %s despite removed write capability', value =>
    expect(
      action('manage_series').inputSchema.safeParse({
        action: value,
        seriesId: 'legacy',
        name: 'name',
        slug: 'slug',
        sortOrder: 'asc'
      }).success
    ).toBe(true));
  it.each([
    'list',
    'add',
    'reply',
    'delete_comment',
    'delete_reply'
  ])('retains comment action %s despite removed writes', value =>
    expect(
      action('manage_comments').inputSchema.safeParse({
        action: value,
        postId: 'legacy',
        commentId: 'legacy',
        replyId: 'legacy',
        contentMarkdown: 'text'
      }).success
    ).toBe(true));
  it.each([
    'create',
    'get',
    'list',
    'publish',
    'update',
    'delete'
  ])('supports native draft action %s', value =>
    expect(
      action('manage_draft').inputSchema.safeParse({
        action: value,
        draftId: '123456789012345678901234',
        title: 'title',
        contentMarkdown: 'text'
      }).success
    ).toBe(true));
  it('retains legacy unsupported tag ID and newsletter fields for actionable runtime guidance', () => {
    expect(
      action('publish_post').inputSchema.safeParse({
        title: 't',
        contentMarkdown: 'c',
        sendNewsletter: false,
        tags: [{ tagId: 'legacy', slug: 'typescript' }]
      }).success
    ).toBe(true);
    expect(
      action('subscribe_newsletter').inputSchema.safeParse({ email: 'test@example.invalid' })
        .success
    ).toBe(true);
    expect(action('subscribe_newsletter').tags?.deprecated).toBe(true);
  });
  it.each([
    'list_posts',
    'list_publications',
    'search_posts',
    'manage_series',
    'list_static_pages'
  ])('rejects fractional/out-of-range paging for %s', key => {
    for (const first of [0, 101, 1.5])
      expect(
        action(key).inputSchema.safeParse({ first, action: 'list', query: 'term' }).success
      ).toBe(false);
    expect(
      action(key).inputSchema.safeParse({ first: 100, action: 'list', query: 'term' }).success
    ).toBe(true);
  });
  it('keeps the native fifty-draft page maximum', () => {
    expect(
      action('manage_draft').inputSchema.safeParse({ action: 'list', first: 50 }).success
    ).toBe(true);
    expect(
      action('manage_draft').inputSchema.safeParse({ action: 'list', first: 51 }).success
    ).toBe(false);
  });
  it('preserves native nullable legacy output metadata', () => {
    expect(
      action('manage_series').outputSchema.safeParse({
        series: { seriesId: 'id', createdAt: null, sortOrder: null }
      }).success
    ).toBe(true);
    expect(
      action('get_user').outputSchema.safeParse({ userId: 'id', username: 'name', name: null })
        .success
    ).toBe(true);
  });
});

type JsonShape = {
  properties?: Record<string, JsonShape>;
  items?: JsonShape;
  anyOf?: JsonShape[];
};
function retained(before: JsonShape, after: JsonShape) {
  for (const [key, value] of Object.entries(before.properties ?? {})) {
    expect(after.properties?.[key], `Legacy field ${key}`).toBeDefined();
    retained(value, after.properties![key]!);
  }
  if (before.items && after.items) retained(before.items, after.items);
  for (const branch of before.anyOf ?? [])
    if (branch.properties)
      retained(branch, after.anyOf?.find(item => item.properties) ?? after);
}
describe('Genuine released nested schema fields', () => {
  it.each(Object.keys(legacySchemas))('preserves input and output properties for %s', key => {
    const original = legacySchemas[key as keyof typeof legacySchemas];
    retained(
      original.input as JsonShape,
      z.toJSONSchema(action(key).inputSchema, { io: 'input' }) as JsonShape
    );
    retained(
      original.output as JsonShape,
      z.toJSONSchema(action(key).outputSchema) as JsonShape
    );
  });
});
