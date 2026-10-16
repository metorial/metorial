import { describeMcpCompatibleToolSchemas } from '@slates/test';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { provider } from './index';

describeMcpCompatibleToolSchemas('Zulip tool input schemas', provider.actions);

describe('Channel subscription replacement contract', () => {
  it('retains the deprecated channel tool and points to its replacement', () => {
    let legacy = provider.actions.find(action => action.key === 'create_channel');
    expect(legacy?.tags?.deprecated).toBe(true);
    expect(
      legacy?.description?.startsWith(
        'DEPRECATED — use `create_or_subscribe_channel` instead.'
      )
    ).toBe(true);
    expect(
      legacy?.instructions?.some(instruction =>
        instruction.includes('create_or_subscribe_channel')
      )
    ).toBe(true);
    expect(provider.actions.some(action => action.key === 'create_or_subscribe_channel')).toBe(
      true
    );
  });

  it('preserves the exact legacy input and output schemas', () => {
    let legacy = provider.actions.find(action => action.key === 'create_channel')!;
    expect(z.toJSONSchema(legacy.inputSchema)).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Name of the new channel'
        },
        description: {
          description: 'Description of the channel',
          type: 'string'
        },
        isPrivate: {
          description:
            'Whether the channel should be private (invite-only). Defaults to false',
          type: 'boolean'
        },
        historyPublicToSubscribers: {
          description:
            'Whether history is available to new subscribers. Defaults to true for public channels',
          type: 'boolean'
        }
      },
      required: ['name'],
      additionalProperties: false
    });
    expect(z.toJSONSchema(legacy.outputSchema)).toEqual({
      $schema: 'https://json-schema.org/draft/2020-12/schema',
      type: 'object',
      properties: {
        created: {
          type: 'boolean',
          description: 'Whether the channel was newly created'
        },
        alreadySubscribed: {
          description: 'Channel names that already existed and were subscribed to',
          type: 'array',
          items: {
            type: 'string'
          }
        }
      },
      required: ['created'],
      additionalProperties: false
    });
  });
});
