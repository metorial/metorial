import { createLocalSlateTestClient, getSlateContract } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { provider } from '../index';

let client = () =>
  createLocalSlateTestClient({
    slate: provider,
    state: {
      config: {},
      auth: { authenticationMethodId: 'api_key', output: { token: 'cursor-token' } }
    }
  });

describe('Cursor launch_agent receiver-bound contract', () => {
  it('removes callback authority from public input and advertises named receiver context', async () => {
    let contract = await getSlateContract(client());
    let action = contract.tools.find(tool => tool.id === 'launch_agent');
    let serialized = JSON.stringify(action);
    expect(serialized).toContain('receiverBoundToolContextV1');
    expect(serialized).toContain('cursor_webhook_secret');
    expect(serialized).not.toContain('webhookUrl');
    expect(serialized).not.toContain('webhookSecret');
  });
});
