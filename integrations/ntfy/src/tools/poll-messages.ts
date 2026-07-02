import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let pollMessages = SlateTool.create(spec, {
  name: 'Poll Messages',
  key: 'poll_messages',
  description: `Retrieve cached messages from an ntfy topic. Returns messages that have been published and are still cached on the server. Supports filtering by time, priority, tags, title, and message content.`,
  instructions: [
    'Use the "since" parameter to fetch messages from a specific point in time. Accepts durations ("10m", "1h"), Unix timestamps, message IDs, or "all" for all cached messages.',
    'Priority filter uses logical OR (e.g., "3,4,5" matches any of those levels).',
    'Tags filter uses logical AND (all specified tags must be present).'
  ],
  constraints: [
    'Messages are cached for 12 hours by default on the public ntfy.sh server.',
    'Only returns messages that are still in the server cache.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      topic: z.string().describe('Topic name to poll messages from'),
      since: z
        .string()
        .optional()
        .describe(
          'Fetch messages since: a duration ("10m", "1h"), Unix timestamp, message ID, or "all"'
        ),
      scheduled: z
        .boolean()
        .optional()
        .describe('Include scheduled/delayed messages that have not been delivered yet'),
      filterPriority: z
        .string()
        .optional()
        .describe(
          'Filter by priority levels, comma-separated (e.g., "3,4,5"). Uses logical OR.'
        ),
      filterTags: z
        .string()
        .optional()
        .describe(
          'Filter by tags, comma-separated (e.g., "warning,error"). Uses logical AND.'
        ),
      filterTitle: z.string().optional().describe('Filter by exact title match'),
      filterMessage: z.string().optional().describe('Filter by exact message body match')
    })
  )
  .output(
    z.object({
      messages: z
        .array(
          z.object({
            messageId: z.string().describe('Unique ID of the message'),
            time: z.number().describe('Unix timestamp when the message was published'),
            topic: z.string().describe('Topic the message belongs to'),
            title: z.string().optional().describe('Notification title'),
            message: z.string().optional().describe('Notification message body'),
            priority: z.number().optional().describe('Priority level (1-5)'),
            tags: z.array(z.string()).optional().describe('Tags assigned to the message'),
            clickUrl: z.string().optional().describe('Click action URL'),
            iconUrl: z.string().optional().describe('Notification icon URL'),
            expires: z.number().optional().describe('Unix timestamp when the message expires'),
            attachment: z
              .object({
                name: z.string().describe('Attachment filename'),
                url: z.string().describe('Attachment download URL'),
                type: z.string().optional().describe('MIME type'),
                size: z.number().optional().describe('File size in bytes'),
                expires: z
                  .number()
                  .optional()
                  .describe('Unix timestamp when the attachment expires')
              })
              .optional()
              .describe('File attachment details')
          })
        )
        .describe('List of messages from the topic'),
      totalCount: z.number().describe('Total number of messages returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      serverUrl: ctx.config.serverUrl,
      auth: ctx.auth
    });

    ctx.info(`Polling messages from topic "${ctx.input.topic}"`);

    let messages = await client.pollMessages({
      topic: ctx.input.topic,
      since: ctx.input.since,
      scheduled: ctx.input.scheduled,
      filterPriority: ctx.input.filterPriority,
      filterTags: ctx.input.filterTags,
      filterTitle: ctx.input.filterTitle,
      filterMessage: ctx.input.filterMessage
    });

    let outputMessages = messages.map(m => ({
      messageId: m.messageId,
      time: m.time,
      topic: m.topic,
      title: m.title,
      message: m.message,
      priority: m.priority,
      tags: m.tags,
      clickUrl: m.clickUrl,
      iconUrl: m.iconUrl,
      expires: m.expires,
      attachment: m.attachment
    }));

    return {
      output: {
        messages: outputMessages,
        totalCount: outputMessages.length
      },
      message: `Retrieved **${outputMessages.length}** message(s) from topic **${ctx.input.topic}**${ctx.input.since ? ` since ${ctx.input.since}` : ''}.`
    };
  })
  .build();
