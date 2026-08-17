import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { ChatAdapter, sendMessage } from './index';
import {
  createTestSpec,
  listToolDefinitions,
  stubAllTools,
  stubAllTriggers
} from './test-helpers';

let capabilityIds = (declared: boolean) =>
  Object.entries(ChatAdapter.capabilityRules)
    .filter(
      ([, value]) =>
        ((value.tools?.length ?? 0) === 0 && (value.triggers?.length ?? 0) === 0) === declared
    )
    .map(([id]) => id)
    .sort();

let derivedCapabilityIds = capabilityIds(false);
let declaredCapabilityIds = capabilityIds(true);

let enabledIds = (capabilities: { id: string; value: unknown }[]) =>
  capabilities
    .filter(capability => capability.value === true)
    .map(capability => capability.id)
    .sort();

let disabledDeclaredIds = (capabilities: { id: string; value: unknown }[]) =>
  capabilities
    .filter(capability => capability.value === false)
    .map(capability => capability.id)
    .sort();

describe('ChatAdapter', () => {
  it('registers with no implementations and declared capabilities set to false', () => {
    let adapter = ChatAdapter.register({
      tools: [],
      triggers: []
    });

    expect(adapter.id).toBe('chat');
    expect(adapter.name).toBe('Chat');
    expect(enabledIds(adapter.capabilities)).toEqual([]);
    expect(disabledDeclaredIds(adapter.capabilities)).toEqual(declaredCapabilityIds);
    expect(adapter.tools).toEqual([]);
    expect(adapter.triggers).toEqual([]);
  });

  it('derives capabilities from implemented tools and triggers', () => {
    let spec = createTestSpec();
    let adapter = ChatAdapter.register({
      tools: stubAllTools(spec),
      triggers: stubAllTriggers(spec)
    });

    expect(enabledIds(adapter.capabilities)).toEqual(derivedCapabilityIds);
    expect(disabledDeclaredIds(adapter.capabilities)).toEqual(declaredCapabilityIds);
  });

  it('lets implementations enable declared capabilities', () => {
    let spec = createTestSpec();
    let adapter = ChatAdapter.register({
      tools: stubAllTools(spec),
      triggers: stubAllTriggers(spec),
      capabilities: {
        content_markdown: true,
        content_cards: true,
        attachment_image: true
      }
    });

    expect(enabledIds(adapter.capabilities)).toEqual(
      [...derivedCapabilityIds, 'attachment_image', 'content_cards', 'content_markdown'].sort()
    );
    expect(adapter.capabilities).toContainEqual({ id: 'content_tables', value: false });
  });

  it('derives only message_send when only send is implemented', () => {
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

    expect(enabledIds(adapter.capabilities)).toEqual(['message_send']);
    expect(disabledDeclaredIds(adapter.capabilities)).toEqual(declaredCapabilityIds);
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
