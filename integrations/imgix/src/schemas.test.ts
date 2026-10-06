import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';
import { spec } from './spec';

const legacy = [
  'list_sources',
  'get_source',
  'create_source',
  'update_source',
  'list_assets',
  'get_asset',
  'update_asset',
  'refresh_asset',
  'purge_cache',
  'get_reports',
  'generate_signed_url',
  'build_render_url'
];
const action = (key: string) => {
  const value = provider.actions.find(item => item.key === key);
  if (!value) throw new Error(`Missing schema ${key}`);
  return value;
};
describeMcpCompatibleToolSchemas('imgix object schemas', provider.actions);
describe('imgix schema compatibility', () => {
  it('retains all legacy keys, fourteen public tools and one reserved file helper', () => {
    expect(legacy.every(key => provider.actions.some(item => item.key === key))).toBe(true);
    expect(provider.actions).toHaveLength(15);
    expect(provider.actions.some(item => item.key === 'metorial$getFileUrl')).toBe(true);
    expect(
      provider.actions
        .filter(item => !item.key.startsWith('metorial$'))
        .every(item => `imgix-${item.key}`.length < 60)
    ).toBe(true);
  });
  it('preserves manual signing and adds optional source discovery', () => {
    expect(
      action('generate_signed_url').inputSchema.parse({
        domain: 'test.imgix.net',
        path: 'image.jpg',
        secureUrlToken: 'synthetic'
      })
    ).toMatchObject({ secureUrlToken: 'synthetic' });
    expect(
      action('generate_signed_url').inputSchema.parse({
        sourceId: 'source-1',
        path: 'image.jpg'
      })
    ).toMatchObject({ sourceId: 'source-1' });
  });
  it('preserves source creation fields for six supported storage variants', () => {
    for (const type of ['s3', 'gcs', 'azure', 'webfolder', 'webproxy', 's3_compatible'])
      expect(
        action('create_source').inputSchema.parse({
          name: 'schema',
          deployment: {
            type,
            imgixSubdomains: ['schema'],
            s3AccessKey: 'synthetic',
            s3SecretKey: 'synthetic',
            s3Bucket: 'schema'
          }
        })
      ).toMatchObject({ deployment: { type, imgixSubdomains: ['schema'] } });
  });
  it('retains legacy source update inputs and adds explicit full replacement', () => {
    expect(
      action('update_source').inputSchema.parse({
        sourceId: 'source-1',
        cacheTtlValue: 1800,
        deployment: { customDomains: [] }
      })
    ).toMatchObject({ cacheTtlValue: 1800, deployment: { customDomains: [] } });
    expect(
      action('update_source').inputSchema.parse({
        sourceId: 'source-1',
        replacementDeployment: {
          type: 'webfolder',
          imgixSubdomains: ['schema'],
          webfolderBaseUrl: 'https://example.invalid/'
        }
      })
    ).toMatchObject({ replacementDeployment: { type: 'webfolder' } });
  });
  it('uses native page zero and preserves opaque cursor fields', () => {
    expect(action('list_sources').inputSchema.parse({})).toMatchObject({
      pageNumber: 0,
      pageSize: 20
    });
    expect(
      action('list_assets').inputSchema.parse({ sourceId: 'source-1', cursor: 'opaque+/?=' })
    ).toMatchObject({ cursor: 'opaque+/?=' });
  });
  it('retains report variants with additive credit types and download selection', () => {
    for (const reportType of [
      'image_analytics',
      'source_analytics',
      'cdn_logs',
      'mild_errors',
      'credit_analytics_daily',
      'credit_analytics_mtd'
    ])
      expect(action('get_reports').inputSchema.parse({ reportType })).toMatchObject({
        reportType
      });
    expect(
      action('get_reports').inputSchema.parse({ reportId: 'report-1', downloadFiles: true })
    ).toMatchObject({ downloadFiles: true });
  });
  it('keeps config empty and source IDs tool-scoped', () => {
    expect(spec.configSchema.parse({})).toEqual({});
    const schema = action('download_asset').inputSchema;
    expect(
      schema.safeParse({
        sourceId: 'source-1',
        originPath: 'image.jpg',
        expiresAt: 1700000000
      }).success
    ).toBe(true);
  });
});
