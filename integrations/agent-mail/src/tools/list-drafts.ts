import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listDrafts = SlateTool.create(spec, {
  name: 'List Drafts',
  key: 'list_drafts',
  description: `List email drafts in an inbox. Returns draft metadata including subject, recipients, and scheduled send time. Supports pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      inboxId: z.string().describe('Inbox to list drafts from'),
      limit: z.number().optional().describe('Maximum drafts per page'),
      pageToken: z.string().optional().describe('Pagination cursor from a previous response'),
      ascending: z.boolean().optional().describe('Sort oldest first when true')
    })
  )
  .output(
    z.object({
      count: z.number().describe('Number of drafts in this page'),
      nextPageToken: z.string().optional().describe('Cursor for the next page'),
      drafts: z
        .array(
          z.object({
            draftId: z.string().describe('Unique draft identifier'),
            inboxId: z.string().describe('Inbox the draft belongs to'),
            to: z.array(z.string()).describe('Recipient addresses'),
            subject: z.string().optional().describe('Subject line'),
            preview: z.string().optional().describe('Text preview'),
            sendStatus: z.string().optional().describe('Sending status'),
            sendAt: z.string().optional().describe('Scheduled send time'),
            createdAt: z.string().describe('Creation timestamp')
          })
        )
        .describe('Array of drafts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, podId: ctx.config.podId });

    let result = await client.listDrafts(ctx.input.inboxId, {
      limit: ctx.input.limit,
      pageToken: ctx.input.pageToken,
      ascending: ctx.input.ascending
    });

    let drafts = result.drafts.map(d => ({
      draftId: d.draft_id,
      inboxId: d.inbox_id,
      to: d.to,
      subject: d.subject,
      preview: d.preview,
      sendStatus: d.send_status,
      sendAt: d.send_at,
      createdAt: d.created_at
    }));

    return {
      output: {
        count: result.count,
        nextPageToken: result.nextPageToken,
        drafts
      },
      message: `Found **${result.count}** draft(s) in inbox ${ctx.input.inboxId}.`
    };
  })
  .build();
