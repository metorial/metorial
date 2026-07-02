import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listPushes = SlateTool.create(spec, {
  name: 'List Pushes',
  key: 'list_pushes',
  description: `Retrieve a list of pushes from the account. Can filter by modification time, active status, and supports pagination. Returns pushes sorted by most recent first.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      modifiedAfter: z
        .string()
        .optional()
        .describe('Only return pushes modified after this Unix timestamp'),
      activeOnly: z
        .boolean()
        .optional()
        .default(true)
        .describe('Only return non-deleted pushes'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response'),
      limit: z.number().optional().describe('Maximum number of pushes to return (max 500)')
    })
  )
  .output(
    z.object({
      pushes: z.array(
        z.object({
          pushIden: z.string().describe('Unique identifier of the push'),
          type: z.string().describe('Type of push: note, link, or file'),
          active: z.boolean().describe('Whether the push is active (not deleted)'),
          dismissed: z.boolean().describe('Whether the push has been dismissed'),
          direction: z.string().describe('Push direction: self, outgoing, or incoming'),
          title: z.string().optional().describe('Title of the push'),
          body: z.string().optional().describe('Body text of the push'),
          url: z.string().optional().describe('URL (for link pushes)'),
          fileName: z.string().optional().describe('File name (for file pushes)'),
          fileUrl: z.string().optional().describe('File URL (for file pushes)'),
          fileType: z.string().optional().describe('MIME type (for file pushes)'),
          senderName: z.string().optional().describe('Name of the sender'),
          senderEmail: z.string().optional().describe('Email of the sender'),
          receiverEmail: z.string().optional().describe('Email of the receiver'),
          targetDeviceIden: z.string().optional().describe('Target device identifier'),
          created: z.string().describe('Creation Unix timestamp'),
          modified: z.string().describe('Last modification Unix timestamp')
        })
      ),
      cursor: z.string().optional().describe('Cursor for fetching the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listPushes({
      modifiedAfter: ctx.input.modifiedAfter,
      active: ctx.input.activeOnly,
      cursor: ctx.input.cursor,
      limit: ctx.input.limit
    });

    let pushes = result.pushes.map(p => ({
      pushIden: p.iden,
      type: p.type,
      active: p.active,
      dismissed: p.dismissed,
      direction: p.direction,
      title: p.title,
      body: p.body,
      url: p.url,
      fileName: p.file_name,
      fileUrl: p.file_url,
      fileType: p.file_type,
      senderName: p.sender_name,
      senderEmail: p.sender_email,
      receiverEmail: p.receiver_email,
      targetDeviceIden: p.target_device_iden,
      created: String(p.created),
      modified: String(p.modified)
    }));

    return {
      output: {
        pushes,
        cursor: result.cursor
      },
      message: `Retrieved **${pushes.length}** push(es).${result.cursor ? ' More results available with cursor.' : ''}`
    };
  })
  .build();
