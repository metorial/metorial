import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from './index';

describeMcpCompatibleToolSchemas('tl;dv tool input schemas', provider.actions);

describe('tl;dv notes deprecation contract', () => {
  it('keeps the highlights tool and exposes the current notes tool', () => {
    let legacy = provider.actions.find(action => action.key === 'get_highlights');
    let replacement = provider.actions.find(action => action.key === 'get_notes');
    expect(legacy?.type).toBe('tool');
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(replacement?.type).toBe('tool');
  });
});
