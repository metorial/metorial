import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  actionsPartSchema,
  authorSchema,
  cardPartSchema,
  channelSchema,
  chatBodySchema,
  chatPartSchema,
  cursorPageResultSchema,
  cursorPageSchema,
  decodeCursor,
  encodeCursor,
  markdownPartSchema,
  tablePartSchema,
  workspaceSchema
} from './schema';

describe('chat part schemas', () => {
  it('parses markdown, table, and nested card/section parts', () => {
    expect(markdownPartSchema.parse({ type: 'markdown', markdown: '**hi**' })).toEqual({
      type: 'markdown',
      markdown: '**hi**'
    });

    expect(
      tablePartSchema.parse({
        type: 'table',
        headers: ['A'],
        rows: [['1']]
      })
    ).toMatchObject({ type: 'table' });

    let mixed = chatPartSchema.parse({
      type: 'card',
      title: 'Deploy',
      children: [
        { type: 'markdown', markdown: 'Ready' },
        {
          type: 'section',
          children: [{ type: 'text', content: 'inner' }]
        },
        {
          type: 'actions',
          children: [{ type: 'button', id: 'ok', label: 'OK' }]
        }
      ]
    });

    expect(mixed.type).toBe('card');
    expect(cardPartSchema.parse(mixed).children).toHaveLength(3);
  });

  it('rejects unknown part types and field as a top-level part', () => {
    expect(() => chatPartSchema.parse({ type: 'unknown' })).toThrow();
    expect(() =>
      chatPartSchema.parse({ type: 'field', label: 'Env', value: 'prod' })
    ).toThrow();
  });

  it('parses action children on an actions part', () => {
    expect(
      actionsPartSchema.parse({
        type: 'actions',
        children: [
          { type: 'button', id: 'a', label: 'A', style: 'primary' },
          { type: 'link-button', label: 'Docs', url: 'https://example.com' }
        ]
      }).children
    ).toHaveLength(2);
  });

  it('requires parts and keeps attachments on the body', () => {
    expect(
      chatBodySchema.parse({
        parts: [{ type: 'markdown', markdown: 'hi' }],
        altText: 'hi',
        attachments: [{ type: 'file', name: 'a.txt' }]
      })
    ).toMatchObject({ altText: 'hi' });

    expect(() => chatBodySchema.parse({ parts: [] })).toThrow();
    expect(() =>
      chatBodySchema.parse({
        markdown: 'hi'
      })
    ).toThrow();
  });

  it('accepts bidirectional page requests and results', () => {
    expect(
      cursorPageSchema.parse({ cursor: 'c1', direction: 'backward', limit: 50 })
    ).toMatchObject({ direction: 'backward' });

    expect(
      cursorPageResultSchema.parse({
        nextCursor: 'older',
        prevCursor: 'newer'
      })
    ).toEqual({ nextCursor: 'older', prevCursor: 'newer' });

    expect(cursorPageResultSchema.parse({ nextCursor: 'only-forward' })).toEqual({
      nextCursor: 'only-forward'
    });
  });
});

describe('workspace and channel', () => {
  it('parses a workspace and an optional channel membership', () => {
    expect(
      workspaceSchema.parse({
        id: 'T123',
        name: 'Acme',
        domain: 'acme',
        imageUrl: 'https://example.com/icon.png'
      })
    ).toMatchObject({ id: 'T123', name: 'Acme' });

    expect(channelSchema.parse({ id: 'C1', type: 'public' }).workspaceId).toBeUndefined();
    expect(
      channelSchema.parse({ id: 'C1', type: 'dm', workspaceId: 'T123' }).workspaceId
    ).toBe('T123');
  });

  it('classifies authors and channels by type', () => {
    expect(
      authorSchema.parse({
        userId: 'U1',
        userName: 'ada',
        fullName: 'Ada Lovelace',
        type: 'user',
        isMe: false
      }).type
    ).toBe('user');

    expect(
      authorSchema.parse({
        userId: 'B1',
        userName: 'deploy-bot',
        fullName: 'Deploy Bot',
        type: 'app',
        isMe: true
      }).type
    ).toBe('app');

    expect(channelSchema.parse({ id: 'C1', type: 'group_dm' }).type).toBe('group_dm');
    expect(channelSchema.parse({ id: 'C2', type: 'shared' }).type).toBe('shared');
    expect(() => channelSchema.parse({ id: 'C3' })).toThrow();
    expect(() =>
      authorSchema.parse({
        userId: 'U1',
        userName: 'ada',
        fullName: 'Ada',
        isMe: false
      })
    ).toThrow();
  });
});

describe('cursor encoding', () => {
  it('round-trips provider, direction, and custom data as JSON', () => {
    let encoded = encodeCursor({
      provider: 'slack',
      direction: 'backward',
      data: { ts: '123.456', channelId: 'C1' }
    });

    expect(JSON.parse(encoded)).toEqual({
      provider: 'slack',
      direction: 'backward',
      data: { ts: '123.456', channelId: 'C1' }
    });

    expect(decodeCursor(encoded)).toEqual({
      provider: 'slack',
      direction: 'backward',
      data: { ts: '123.456', channelId: 'C1' }
    });
  });

  it('validates custom data when a schema is provided', () => {
    let encoded = encodeCursor({
      provider: 'discord',
      direction: 'forward',
      data: { id: '99' }
    });

    expect(decodeCursor(encoded, z.object({ id: z.string() })).data).toEqual({ id: '99' });

    expect(() => decodeCursor(encoded, z.object({ id: z.number() }))).toThrow();
  });

  it('rejects invalid JSON and missing fields', () => {
    expect(() => decodeCursor('not-json')).toThrow('Chat cursor is not valid JSON');
    expect(() => decodeCursor('{"provider":"slack"}')).toThrow();
  });
});
