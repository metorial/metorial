import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Writer tool input schemas', provider.actions);

describe('Writer download deprecation contract', () => {
  it('retains the text-download tool and exposes the original-file download', () => {
    let legacy = provider.actions.find(action => action.key === 'download_file');
    let replacement = provider.actions.find(action => action.key === 'download_original_file');
    expect(legacy?.type).toBe('tool');
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(replacement?.type).toBe('tool');
  });
});
