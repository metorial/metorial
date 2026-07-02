import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listMessages = SlateTool.create(spec, {
  name: 'List Messages',
  key: 'list_messages',
  description: `Retrieve messages from your TextIt workspace. Filter by folder (inbox, flows, archived, outbox, sent, failed), contact, label, or date range. Returns messages sorted by most recently created first.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      folder: z
        .enum(['inbox', 'flows', 'archived', 'outbox', 'sent', 'failed'])
        .optional()
        .describe('Message folder to filter by'),
      contactUuid: z.string().optional().describe('Filter by contact UUID'),
      labelUuidOrName: z.string().optional().describe('Filter by label UUID or name'),
      before: z
        .string()
        .optional()
        .describe('Return only messages created before this date (ISO 8601)'),
      after: z
        .string()
        .optional()
        .describe('Return only messages created after this date (ISO 8601)')
    })
  )
  .output(
    z.object({
      messages: z.array(
        z.object({
          messageUuid: z.string(),
          contactUuid: z.string(),
          contactName: z.string().nullable(),
          urn: z.string(),
          direction: z.enum(['incoming', 'outgoing']),
          type: z.string(),
          status: z.string(),
          text: z.string(),
          attachments: z.array(z.string()),
          labels: z.array(z.object({ labelUuid: z.string(), name: z.string() })),
          createdOn: z.string(),
          sentOn: z.string().nullable()
        })
      ),
      hasMore: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.listMessages({
      folder: ctx.input.folder,
      contact: ctx.input.contactUuid,
      label: ctx.input.labelUuidOrName,
      before: ctx.input.before,
      after: ctx.input.after
    });

    let messages = result.results.map(m => ({
      messageUuid: m.uuid,
      contactUuid: m.contact.uuid,
      contactName: m.contact.name,
      urn: m.urn,
      direction: m.direction,
      type: m.type,
      status: m.status,
      text: m.text,
      attachments: m.attachments,
      labels: m.labels.map(l => ({ labelUuid: l.uuid, name: l.name })),
      createdOn: m.created_on,
      sentOn: m.sent_on
    }));

    return {
      output: {
        messages,
        hasMore: result.next !== null
      },
      message: `Found **${messages.length}** message(s)${result.next ? ' (more results available)' : ''}.`
    };
  })
  .build();
