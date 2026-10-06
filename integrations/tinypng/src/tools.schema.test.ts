import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('TinyPNG input schemas', provider.actions);
const action = (key: string) => provider.actions.find(a => a.key === key)!;
describe('TinyPNG compatibility contracts', () => {
  it('retains exactly five legacy public keys and no triggers', () => {
    expect(provider.actions.map(a => a.key).sort()).toEqual([
      'compress_image',
      'convert_image',
      'get_compression_count',
      'resize_image',
      'save_to_cloud'
    ]);
    for (const a of provider.actions) expect(`tinypng-${a.key}`.length).toBeLessThan(60);
    expect(provider.actions.every(a => a.type === 'tool')).toBe(true);
  });
  it('retains legacy string/array format and nested storage branches', () => {
    for (const targetType of ['image/webp', ['image/webp', 'image/png'], '*/*'])
      expect(
        action('convert_image').inputSchema.safeParse({
          sourceUrl: 'https://example.invalid/image.png',
          targetType
        }).success
      ).toBe(true);
    for (const storage of [
      {
        service: 's3',
        awsAccessKeyId: 'key',
        awsSecretAccessKey: 'secret',
        region: 'us-west-1',
        path: 'bucket/a'
      },
      { service: 'gcs', gcpAccessToken: 'token', path: 'bucket/a' }
    ])
      expect(
        action('save_to_cloud').inputSchema.safeParse({
          sourceUrl: 'https://example.invalid/image.png',
          storage,
          resize: { method: 'fit', width: 12, height: 8 },
          preserve: ['copyright', 'creation', 'location']
        }).success
      ).toBe(true);
  });
  it('preserves legacy outputs while permitting genuinely omitted provider fields', () => {
    const original = {
      inputSize: 100,
      inputType: 'image/png',
      outputSize: 80,
      outputType: 'image/png',
      outputWidth: 10,
      outputHeight: 10,
      compressionRatio: 0.8,
      outputUrl: 'https://api.tinify.com/output/example',
      compressionCount: 1
    };
    expect(action('compress_image').outputSchema.safeParse(original).success).toBe(true);
    for (const key of ['compress_image', 'resize_image', 'convert_image', 'save_to_cloud'])
      expect(action(key).outputSchema.safeParse({}).success).toBe(true);
    expect(
      action('get_compression_count').outputSchema.safeParse({ compressionCount: 0 }).success
    ).toBe(true);
  });
});
