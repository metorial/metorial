import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { config } from './config';
import { provider } from './index';

const legacy = [
  'browse_posts',
  'manage_post',
  'browse_pages',
  'manage_page',
  'browse_tags',
  'manage_tag',
  'browse_members',
  'manage_member',
  'browse_newsletters',
  'manage_newsletter',
  'browse_tiers',
  'manage_offer',
  'browse_users',
  'get_site',
  'manage_webhook'
];
const action = (key: string) => provider.actions.find(a => a.key === key)!;
describeMcpCompatibleToolSchemas('Ghost input schemas', provider.actions);
describe('Ghost compatibility contracts', () => {
  it('preserves every legacy key and only the three approved additions', () =>
    expect(provider.actions.map(a => a.key).sort()).toEqual(
      [...legacy, 'get_current_context', 'get_resource', 'export_content'].sort()
    ));
  it('has valid production IDs and no required site config duplication', () => {
    for (const a of provider.actions) expect(`ghost-${a.key}`.length).toBeLessThan(60);
    expect(config.configSchema.safeParse({}).success).toBe(true);
  });
  it.each([
    'manage_post',
    'manage_page',
    'manage_tag',
    'manage_member'
  ])('preserves %s action branches', key => {
    for (const value of ['create', 'read', 'update', 'delete'])
      expect(action(key).inputSchema.safeParse({ action: value }).success).toBe(true);
  });
  it.each(['create', 'read', 'update'])('preserves newsletter %s', value =>
    expect(action('manage_newsletter').inputSchema.safeParse({ action: value }).success).toBe(
      true
    ));
  it.each(['browse', 'create', 'read', 'update'])('preserves offer %s', value =>
    expect(action('manage_offer').inputSchema.safeParse({ action: value }).success).toBe(
      true
    ));
  it.each(['create', 'update', 'delete'])('preserves webhook %s', value =>
    expect(action('manage_webhook').inputSchema.safeParse({ action: value }).success).toBe(
      true
    ));
  it.each([
    'browse_posts',
    'browse_pages',
    'browse_tags',
    'browse_tiers'
  ])('adds optional API selection to %s', key => {
    expect(action(key).inputSchema.parse({ api: 'content' }).api).toBe('content');
    expect(action(key).inputSchema.safeParse({}).success).toBe(true);
  });
  it('accepts native sparse fields without changing existing scalar types', () => {
    expect(
      action('browse_posts').outputSchema.safeParse({
        posts: [{ postId: 'id', title: 't' }],
        pagination: { page: 1, limit: 15, pages: 1, total: 1, next: null, prev: null }
      }).success
    ).toBe(true);
    expect(
      action('manage_post').outputSchema.safeParse({ postId: 'id', title: 42 }).success
    ).toBe(false);
  });
  it('preserves Lexical, HTML, SEO and timestamp input fields', () => {
    const parsed = action('manage_post').inputSchema.parse({
      action: 'update',
      postId: 'id',
      lexical: '{}',
      updatedAt: 'timestamp',
      ogImage: 'url',
      twitterImage: 'url',
      canonicalUrl: 'url',
      codeinjectionHead: 'head',
      codeinjectionFoot: 'foot'
    });
    expect(Object.keys(parsed)).toHaveLength(9);
  });
  it('preserves native nullable tier benefits and last-update timestamps', () => {
    const row = { tierId: 'id', benefits: null, updatedAt: null };
    expect(
      action('browse_tiers').outputSchema.safeParse({
        tiers: [row],
        pagination: { page: 1, limit: 15, pages: 1, total: 1, next: null, prev: null }
      }).success
    ).toBe(true);
    expect(
      action('get_resource').outputSchema.safeParse({
        resource: 'tier',
        resourceId: 'id',
        benefits: null,
        updatedAt: null
      }).success
    ).toBe(true);
    expect(
      action('get_resource').outputSchema.safeParse({
        resource: 'tier',
        resourceId: 'id',
        benefits: 42
      }).success
    ).toBe(false);
  });
  it('exports exact IDs with metadata and no inline content output', () => {
    expect(
      action('export_content').inputSchema.safeParse({ resource: 'post', format: 'html' })
        .success
    ).toBe(false);
    const schema = action('export_content').outputSchema;
    expect(
      schema.safeParse({
        resource: 'post',
        resourceId: 'id',
        fileName: 'post-id.html',
        mimeType: 'text/html',
        size: 1,
        sha256: 'hash'
      }).success
    ).toBe(true);
  });
});
