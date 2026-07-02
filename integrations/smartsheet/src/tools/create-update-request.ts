import { SlateTool } from 'slates';
import { z } from 'zod';
import { SmartsheetClient } from '../lib/client';
import { spec } from '../spec';

export let createUpdateRequest = SlateTool.create(spec, {
  name: 'Create Update Request',
  key: 'create_update_request',
  description: `Send update requests to collaborators asking them to update specific rows in a sheet. Recipients receive an email with a link to update the specified rows.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      sheetId: z.string().describe('ID of the sheet'),
      rowIds: z.array(z.string()).describe('IDs of the rows to request updates for'),
      sendTo: z.array(z.string()).describe('Email addresses of recipients'),
      subject: z.string().optional().describe('Email subject'),
      message: z.string().optional().describe('Email message'),
      ccMe: z.boolean().optional().describe('CC the sender'),
      columnIds: z.array(z.string()).optional().describe('Limit to specific columns'),
      includeAttachments: z.boolean().optional().describe('Include row attachments'),
      includeDiscussions: z.boolean().optional().describe('Include row discussions')
    })
  )
  .output(
    z.object({
      updateRequestId: z.number().optional().describe('ID of the created update request'),
      success: z.boolean().describe('Whether the update request was sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SmartsheetClient({ token: ctx.auth.token });

    let result = await client.createUpdateRequest(ctx.input.sheetId, {
      rowIds: ctx.input.rowIds.map(Number),
      sendTo: ctx.input.sendTo.map(email => ({ email })),
      subject: ctx.input.subject,
      message: ctx.input.message,
      ccMe: ctx.input.ccMe,
      columnIds: ctx.input.columnIds?.map(Number),
      includeAttachments: ctx.input.includeAttachments,
      includeDiscussions: ctx.input.includeDiscussions
    });

    let req = result.result || result;

    return {
      output: {
        updateRequestId: req.id,
        success: true
      },
      message: `Sent update request to **${ctx.input.sendTo.length}** recipient(s) for **${ctx.input.rowIds.length}** row(s).`
    };
  })
  .build();
