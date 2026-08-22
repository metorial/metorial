import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  actionsPartSchema,
  attachmentRefSchema,
  authorSchema,
  cardPartSchema,
  channelSchema,
  chatBodySchema,
  chatPartSchema,
  commandAutocompleteSchema,
  commandInvokedSchema,
  commandSchema,
  cursorPageResultSchema,
  cursorPageSchema,
  decodeCursor,
  encodeCursor,
  markdownPartSchema,
  messageSchema,
  replyRefSchema,
  tablePartSchema,
  threadSchema,
  toDownloadInput,
  workspaceSchema
} from './schema';
import { uploadFile } from './tools';

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

  it('parses guest authors, provider types, and raw payloads', () => {
    expect(
      authorSchema.parse({
        userId: 'U2',
        userName: 'guest',
        fullName: 'Guest',
        type: 'user',
        role: 'guest',
        providerType: 'restricted',
        isMe: false,
        raw: { slack: true }
      })
    ).toMatchObject({ role: 'guest', providerType: 'restricted' });
  });

  it('parses channel and thread subject, context, and permalink', () => {
    expect(
      channelSchema.parse({
        id: 'C1',
        type: 'public',
        subject: 'Deploy bot',
        permalink: 'https://slack.com/archives/C1',
        context: {
          type: 'pull_request',
          id: '42',
          status: 'open',
          url: 'https://github.com/acme/app/pull/42',
          labels: ['chat']
        }
      })
    ).toMatchObject({ subject: 'Deploy bot', context: { type: 'pull_request', id: '42' } });

    expect(
      threadSchema.parse({
        id: 'T1',
        channelId: 'C1',
        type: 'post',
        providerType: 'pull_request',
        subject: 'Fix login',
        permalink: 'https://github.com/acme/app/pull/42'
      })
    ).toMatchObject({ type: 'post', subject: 'Fix login' });

    expect(() => threadSchema.parse({ id: 'T1', channelId: 'C1' })).toThrow();
  });

  it('treats an empty reply as a normal message and accepts snapshots', () => {
    expect(replyRefSchema.parse({})).toEqual({});
    expect(replyRefSchema.parse({ id: 'm0' }).id).toBe('m0');

    let parsed = messageSchema.parse({
      id: 'm2',
      channelId: 'C1',
      author: {
        userId: 'U1',
        userName: 'ada',
        fullName: 'Ada',
        type: 'user',
        isMe: false
      },
      body: { parts: [{ type: 'markdown', markdown: 're: hi' }] },
      reply: {
        id: 'm1',
        reference: {
          id: 'm1',
          channelId: 'C1',
          author: {
            userId: 'U1',
            userName: 'ada',
            fullName: 'Ada',
            type: 'user',
            isMe: false
          },
          body: { parts: [{ type: 'markdown', markdown: 'hi' }] },
          metadata: { sentAt: '2026-01-01T00:00:00.000Z', edited: false }
        }
      },
      unfurls: [{ url: 'https://github.com/acme/app/pull/42', title: 'Fix login' }],
      metadata: { sentAt: '2026-01-01T00:00:01.000Z', edited: false }
    });

    expect(parsed.reply?.id).toBe('m1');
    expect(parsed.reply?.reference?.id).toBe('m1');
    expect(parsed.unfurls?.[0]?.title).toBe('Fix login');
  });

  it('builds attachment download helper input from a ref', () => {
    let attachment = {
      type: 'file' as const,
      id: 'F1',
      providerFileReference: { fileId: 'F1' },
      name: 'a.txt'
    };

    expect(toDownloadInput(attachment)).toEqual({
      providerFileReference: { fileId: 'F1' }
    });
  });

  it('parses a pending attachment with a source url', () => {
    let parsed = attachmentRefSchema.parse({
      type: 'file',
      name: 'report.pdf',
      status: 'pending',
      sourceUrl: 'https://uploads.example.com/report.pdf?sig=abc',
      clientReferenceId: 'client-ref-1'
    });

    expect(parsed).toMatchObject({
      status: 'pending',
      sourceUrl: 'https://uploads.example.com/report.pdf?sig=abc',
      clientReferenceId: 'client-ref-1'
    });
  });

  it('accepts a message with a provider grouping id', () => {
    let parsed = messageSchema.parse({
      id: 'm3',
      channelId: 'C1',
      author: {
        userId: 'U1',
        userName: 'ada',
        fullName: 'Ada',
        type: 'user',
        isMe: false
      },
      body: { parts: [{ type: 'markdown', markdown: 'album' }] },
      metadata: { sentAt: '2026-01-01T00:00:00.000Z', edited: false },
      groupId: 'media-group-123'
    });

    expect(parsed.groupId).toBe('media-group-123');
  });

  it('validates the file.upload tool input using fileUrl instead of content/encoding', () => {
    let parsed = uploadFile.input.parse({
      channelId: 'C1',
      filename: 'report.pdf',
      mimeType: 'application/pdf',
      fileUrl: 'https://uploads.example.com/report.pdf?sig=abc',
      fileSize: 1024,
      clientReferenceId: 'client-ref-1'
    });

    expect(parsed).toMatchObject({
      channelId: 'C1',
      filename: 'report.pdf',
      fileUrl: 'https://uploads.example.com/report.pdf?sig=abc',
      fileSize: 1024,
      clientReferenceId: 'client-ref-1'
    });

    expect(() =>
      uploadFile.input.parse({
        channelId: 'C1',
        filename: 'report.pdf',
        content: 'aGk=',
        encoding: 'base64'
      })
    ).toThrow();
  });
});

describe('cursor encoding', () => {
  it('round-trips provider, direction, and custom data as JSON', () => {
    let encoded = encodeCursor('slack', {
      direction: 'backward',
      data: { ts: '123.456', channelId: 'C1' }
    });

    expect(JSON.parse(encoded)).toEqual({
      provider: 'slack',
      direction: 'backward',
      data: { ts: '123.456', channelId: 'C1' }
    });

    expect(decodeCursor('slack', encoded)).toEqual({
      provider: 'slack',
      direction: 'backward',
      data: { ts: '123.456', channelId: 'C1' }
    });
  });

  it('validates custom data when a schema is provided', () => {
    let encoded = encodeCursor('discord', {
      direction: 'forward',
      data: { id: '99' }
    });

    expect(decodeCursor('discord', encoded, z.object({ id: z.string() })).data).toEqual({
      id: '99'
    });

    expect(() => decodeCursor('discord', encoded, z.object({ id: z.number() }))).toThrow();
  });

  it('rejects cursors from a different provider', () => {
    let encoded = encodeCursor('discord', {
      direction: 'forward',
      data: { id: '99' }
    });

    expect(() => decodeCursor('slack', encoded)).toThrow(
      'Chat cursor belongs to discord, not slack'
    );
  });

  it('rejects invalid JSON and missing fields', () => {
    expect(() => decodeCursor('slack', 'not-json')).toThrow('Chat cursor is not valid JSON');
    expect(() => decodeCursor('slack', '{"provider":"slack"}')).toThrow();
  });
});

describe('slash commands', () => {
  it('parses a command definition with nested options', () => {
    expect(
      commandSchema.parse({
        name: 'weather',
        description: 'Look up the weather',
        usage: '[zip code]',
        options: [
          {
            name: 'today',
            type: 'subcommand',
            options: [{ name: 'zip', type: 'string', required: true }]
          }
        ]
      })
    ).toMatchObject({
      name: 'weather',
      options: [{ name: 'today', options: [{ name: 'zip', required: true }] }]
    });
  });

  it('parses a freeform invocation and a structured one', () => {
    expect(
      commandInvokedSchema.parse({
        name: 'weather',
        text: '94107',
        author: {
          userId: 'U1',
          userName: 'ada',
          fullName: 'Ada',
          type: 'user',
          isMe: false
        },
        channelId: 'C1',
        triggerId: 'trig-1',
        responseToken: 'https://hooks.slack.com/commands/xxx'
      })
    ).toMatchObject({ name: 'weather', text: '94107' });

    expect(
      commandInvokedSchema.parse({
        name: 'weather',
        subcommand: 'today',
        options: [{ name: 'zip', value: '94107', type: 'string' }],
        author: {
          userId: 'U1',
          userName: 'ada',
          fullName: 'Ada',
          type: 'user',
          isMe: false
        },
        channelId: 'C1',
        responseToken: 'interaction-token'
      }).options?.[0]
    ).toMatchObject({ name: 'zip', value: '94107' });
  });

  it('parses command autocomplete for a focused option', () => {
    expect(
      commandAutocompleteSchema.parse({
        name: 'weather',
        optionName: 'zip',
        query: '94',
        options: [{ name: 'zip', value: '94', type: 'string' }]
      })
    ).toMatchObject({ name: 'weather', optionName: 'zip', query: '94' });
  });

  it('requires a command name', () => {
    expect(() => commandSchema.parse({ description: 'no name' })).toThrow();
    expect(() =>
      commandInvokedSchema.parse({
        text: '94107',
        author: {
          userId: 'U1',
          userName: 'ada',
          fullName: 'Ada',
          type: 'user',
          isMe: false
        },
        channelId: 'C1'
      })
    ).toThrow();
  });
});
