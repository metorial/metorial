import { SlateTool } from 'slates';
import { z } from 'zod';
import { NanonetsClient } from '../lib/client';
import { spec } from '../spec';

export let reviewFile = SlateTool.create(spec, {
  name: 'Review File',
  key: 'review_file',
  description: `Approve or unapprove a processed file in a Nanonets model. Approval marks the file's extracted data as verified. Unapproval reverts an approved file back to the unreviewed state.`,
  instructions: [
    'Only files that have passed all validation stages can be approved.',
    'Rejected files cannot be approved — their status is immutable.',
    'Unapproval only reverts approved files to unapproved; it does not reject them.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      modelId: z.string().describe('ID of the model the file belongs to'),
      requestFileId: z.string().describe('File ID of the processed document to review'),
      action: z.enum(['approve', 'unapprove']).describe('Action to perform on the file')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the action was successful'),
      requestFileId: z.string().describe('ID of the reviewed file'),
      action: z.string().describe('Action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new NanonetsClient(ctx.auth.token);

    if (ctx.input.action === 'approve') {
      await client.approveFile(ctx.input.modelId, ctx.input.requestFileId);
    } else {
      await client.unapproveFile(ctx.input.modelId, ctx.input.requestFileId);
    }

    return {
      output: {
        success: true,
        requestFileId: ctx.input.requestFileId,
        action: ctx.input.action
      },
      message: `Successfully **${ctx.input.action === 'approve' ? 'approved' : 'unapproved'}** file \`${ctx.input.requestFileId}\`.`
    };
  })
  .build();
