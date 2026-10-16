import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Doppler tool input schemas', provider.actions);

describe('Legacy secrets download deprecation', () => {
  it('keeps the old download tool and the file export replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'download_secrets');
    expect(legacy).toBeDefined();
    expect(legacy?.parameters.tags?.deprecated).toBe(true);
    expect(provider.actions.find(action => action.key === 'export_secrets')).toBeDefined();
  });
});
