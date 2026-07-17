import { describe, expect, it } from 'vitest';
import { config } from './config';

describe('Natural config', () => {
  it('accepts an instance ID at the documented maximum length', () => {
    expect(config.configSchema.safeParse({ instanceId: 'i'.repeat(1024) }).success).toBe(true);
  });

  it('rejects an empty instance ID', () => {
    expect(config.configSchema.safeParse({ instanceId: '' }).success).toBe(false);
    expect(config.configSchema.safeParse({ instanceId: '   ' }).success).toBe(false);
  });

  it('rejects an instance ID longer than 1024 characters', () => {
    expect(config.configSchema.safeParse({ instanceId: 'i'.repeat(1025) }).success).toBe(
      false
    );
  });
});
