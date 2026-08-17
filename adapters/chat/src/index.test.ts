import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ChatAdapter, sendMessage } from './index';
import {
  createTestSpec,
  listToolDefinitions,
  stubAllTools,
  stubAllTriggers
} from './test-helpers';

describe('ChatAdapter', () => {
  it('registers with no implementations and no capabilities', () => {
    let adapter = ChatAdapter.register({
      tools: [],
      triggers: []
    });

    expect(adapter.id).toBe('chat');
    expect(adapter.name).toBe('Chat');
    expect(adapter.capabilities).toEqual([]);
    expect(adapter.tools).toEqual([]);
    expect(adapter.triggers).toEqual([]);
  });

  it('derives capabilities from implemented tools and triggers', () => {
    let spec = createTestSpec();
    let adapter = ChatAdapter.register({
      tools: stubAllTools(spec),
      triggers: stubAllTriggers(spec)
    });

    let ids = adapter.capabilities.map(capability => capability.id).sort();
    expect(ids).toEqual(
      [
        'cards',
        'channels',
        'delete',
        'dms',
        'edit',
        'ephemeral',
        'files',
        'inbound',
        'inbound_actions',
        'inbound_reactions',
        'markdown',
        'mentions',
        'modals',
        'react',
        'read',
        'reply',
        'schedule',
        'search',
        'send',
        'threads',
        'typing',
        'users',
        'workspaces'
      ].sort()
    );
  });

  it('derives only send/cards/markdown when only send is implemented', () => {
    let spec = createTestSpec();
    let send = sendMessage
      .implement(spec)
      .handleInvocation(async () => ({
        output: {
          message: {
            id: 'm1',
            channelId: 'C1',
            author: {
              userId: 'U1',
              userName: 'bot',
              fullName: 'Bot',
              type: 'app',
              isMe: true
            },
            body: { parts: [{ type: 'markdown', markdown: 'hi' }] },
            metadata: { sentAt: '2026-01-01T00:00:00.000Z', edited: false }
          }
        },
        message: 'ok'
      }))
      .build();

    let adapter = ChatAdapter.register({
      tools: [send],
      triggers: []
    });

    expect(adapter.capabilities).toEqual([
      { id: 'send', value: true },
      { id: 'cards', value: true },
      { id: 'markdown', value: true }
    ]);
  });

  it('rejects unknown implementations', () => {
    expect(() =>
      ChatAdapter.register({
        tools: [
          {
            key: 'gmail.labels'
          } as any
        ],
        triggers: []
      })
    ).toThrow('Tool "gmail.labels" is not defined on adapter "chat"');
  });

  it('uses MCP-compatible top-level object schemas for every tool', () => {
    for (let tool of listToolDefinitions()) {
      let jsonSchema = z.toJSONSchema(tool.input) as Record<string, unknown>;
      expect(jsonSchema.type, tool.key).toBe('object');
      expect(jsonSchema, tool.key).not.toHaveProperty('oneOf');
      expect(jsonSchema, tool.key).not.toHaveProperty('anyOf');
      expect(jsonSchema, tool.key).not.toHaveProperty('allOf');
    }
  });
});
