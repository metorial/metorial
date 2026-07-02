import { SlateTool } from 'slates';
import { z } from 'zod';
import { HootsuiteClient } from '../lib/client';
import { spec } from '../spec';

export let listMessagesTool = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve scheduled, sent, or pending-approval messages within a time range.
Can filter by social profile IDs and message state. Also supports fetching a single message by ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      messageId: z
        .string()
        .optional()
        .describe('Fetch a single message by its ID (overrides time range filters)'),
      startTime: z
        .string()
        .optional()
        .describe('Start of time range in UTC ISO-8601 (required if no messageId)'),
      endTime: z
        .string()
        .optional()
        .describe('End of time range in UTC ISO-8601 (required if no messageId)'),
      socialProfileIds: z
        .array(z.string())
        .optional()
        .describe('Filter by social profile IDs'),
      state: z
        .enum(['SCHEDULED', 'SENT', 'SEND_FAILED', 'PENDING_APPROVAL', 'REJECTED'])
        .optional()
        .describe('Filter by message state'),
      limit: z.number().optional().describe('Maximum number of messages to return'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageId: z.string().describe('Message ID'),
          state: z.string().describe('Message state'),
          text: z.string().optional().describe('Message text'),
          socialProfileId: z.string().optional().describe('Target social profile ID'),
          scheduledSendTime: z
            .string()
            .optional()
            .describe('When the message is/was scheduled'),
          postUrl: z.string().optional().describe('URL of published post'),
          sequenceNumber: z.number().optional().describe('Sequence number for approve/reject'),
          tags: z.array(z.string()).optional().describe('Tags applied')
        })
      ),
      cursor: z.string().optional().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HootsuiteClient(ctx.auth.token);

    if (ctx.input.messageId) {
      let msg = await client.getMessage(ctx.input.messageId);
      let messages = [
        {
          messageId: String(msg.id),
          state: msg.state,
          text: msg.text,
          socialProfileId: msg.socialProfile?.id ? String(msg.socialProfile.id) : undefined,
          scheduledSendTime: msg.scheduledSendTime,
          postUrl: msg.postUrl,
          sequenceNumber: msg.sequenceNumber,
          tags: msg.tags
        }
      ];

      return {
        output: { messages, cursor: undefined },
        message: `Retrieved message **${msg.id}** with state **${msg.state}**.`
      };
    }

    if (!ctx.input.startTime || !ctx.input.endTime) {
      throw new Error('startTime and endTime are required when not fetching by messageId');
    }

    let result = await client.getMessages({
      startTime: ctx.input.startTime,
      endTime: ctx.input.endTime,
      socialProfileIds: ctx.input.socialProfileIds,
      state: ctx.input.state,
      limit: ctx.input.limit,
      cursor: ctx.input.cursor
    });

    let messages = result.messages.map((msg: any) => ({
      messageId: String(msg.id),
      state: msg.state,
      text: msg.text,
      socialProfileId: msg.socialProfile?.id ? String(msg.socialProfile.id) : undefined,
      scheduledSendTime: msg.scheduledSendTime,
      postUrl: msg.postUrl,
      sequenceNumber: msg.sequenceNumber,
      tags: msg.tags
    }));

    return {
      output: { messages, cursor: result.cursor },
      message: `Retrieved **${messages.length}** message(s)${ctx.input.state ? ` with state **${ctx.input.state}**` : ''}.`
    };
  })
  .build();
