import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateNotification = SlateTool.create(spec, {
  name: 'Update Notification',
  key: 'update_notification',
  description: `Update, clear, or delete a previously published notification using the first message ID or its stable sequence ID. Use this to replace a notification's content, dismiss it from the notification drawer, or remove it entirely.`,
  instructions: [
    'Use action "update" to replace the content of an existing notification with new message/title/priority/tags.',
    'Use action "clear" to mark the notification as read and dismiss it from the notification drawer.',
    'Use action "delete" to completely remove the notification from clients.',
    'Pass the sequenceId used when publishing, or the first messageId if no sequence ID was set. Keep using that same identifier across later updates.',
    'Only update accepts message, title, priority, tags, and markdown. Clear and delete do not replace notification content.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      topic: z.string().describe('Topic the original message was published to'),
      messageId: z
        .string()
        .describe(
          'First message ID, or the sequenceId used when publishing; reuse this identifier across all updates, clears, and deletes'
        ),
      action: z
        .enum(['update', 'clear', 'delete'])
        .describe(
          'Action to perform: "update" replaces content, "clear" dismisses, "delete" removes entirely'
        ),
      message: z.string().optional().describe('New message body (only for "update" action)'),
      title: z.string().optional().describe('New title (only for "update" action)'),
      priority: z
        .number()
        .min(1)
        .max(5)
        .optional()
        .describe('New priority level (only for "update" action)'),
      tags: z.array(z.string()).optional().describe('New tags (only for "update" action)'),
      markdown: z
        .boolean()
        .optional()
        .describe('Enable Markdown formatting (only for "update" action)')
    })
  )
  .output(
    z.object({
      messageId: z.string().describe('ID of the published update message'),
      time: z.number().describe('Unix timestamp of the update'),
      topic: z.string().describe('Topic the update was published to'),
      event: z.string().describe('Event type of the response'),
      sequenceId: z
        .string()
        .optional()
        .describe('Stable sequence identifier, when returned by the server')
    })
  )
  .handleInvocation(async ctx => {
    if (
      ctx.input.action !== 'update' &&
      [
        ctx.input.message,
        ctx.input.title,
        ctx.input.priority,
        ctx.input.tags,
        ctx.input.markdown
      ].some(value => value !== undefined)
    ) {
      throw createApiServiceError(
        'Message, title, priority, tags, and markdown are only supported for the update action.'
      );
    }
    let client = new Client({
      serverUrl: ctx.config.serverUrl,
      auth: ctx.auth
    });

    let actionMap: Record<string, string> = {
      update: 'message',
      clear: 'message_clear',
      delete: 'message_delete'
    };

    let eventType = actionMap[ctx.input.action] || 'message';

    ctx.info(
      `Performing "${ctx.input.action}" on message ${ctx.input.messageId} in topic "${ctx.input.topic}"`
    );

    let result = await client.updateMessage({
      topic: ctx.input.topic,
      messageId: ctx.input.messageId,
      eventType,
      message: ctx.input.action === 'update' ? ctx.input.message : undefined,
      title: ctx.input.action === 'update' ? ctx.input.title : undefined,
      priority: ctx.input.action === 'update' ? ctx.input.priority : undefined,
      tags: ctx.input.action === 'update' ? ctx.input.tags : undefined,
      markdown: ctx.input.action === 'update' ? ctx.input.markdown : undefined
    });

    let actionLabel =
      ctx.input.action === 'update'
        ? 'Updated'
        : ctx.input.action === 'clear'
          ? 'Cleared'
          : 'Deleted';

    return {
      output: {
        messageId: result.messageId,
        time: result.time,
        topic: result.topic,
        event: result.event,
        sequenceId: result.sequenceId
      },
      message: `${actionLabel} notification \`${ctx.input.messageId}\` in topic **${ctx.input.topic}**.`
    };
  })
  .build();
