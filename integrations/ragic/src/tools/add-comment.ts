import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addComment = SlateTool.create(spec, {
  name: 'Add Comment',
  key: 'add_comment',
  description: `Add a comment to a specific record in a Ragic sheet. Comments are visible to users who have access to the record.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      tabFolder: z.string().describe('The tab/folder path in the Ragic URL'),
      sheetIndex: z.number().describe('The numeric sheet index from the Ragic URL'),
      recordId: z.number().describe('The ID of the record to comment on'),
      comment: z.string().describe('The comment text to add to the record')
    })
  )
  .output(
    z.object({
      recordId: z.string().describe('The ID of the commented record'),
      response: z.record(z.string(), z.any()).describe('Response from the Ragic API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      serverDomain: ctx.config.serverDomain,
      accountName: ctx.config.accountName
    });

    let sheet = {
      tabFolder: ctx.input.tabFolder,
      sheetIndex: ctx.input.sheetIndex
    };

    let result = await client.addComment(sheet, ctx.input.recordId, ctx.input.comment);

    return {
      output: {
        recordId: String(ctx.input.recordId),
        response: result
      },
      message: `Added comment to record **${ctx.input.recordId}** in sheet **${ctx.input.tabFolder}/${ctx.input.sheetIndex}**.`
    };
  })
  .build();
