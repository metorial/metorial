import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let removeResult = SlateTool.create(spec, {
  name: 'Remove Form Result',
  key: 'remove_result',
  description: `Removes a form result entry. Can either delete the entire result or only remove uploaded files associated with it while keeping the submission data intact.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      resultId: z.string().describe('The unique ID of the result entry to remove'),
      filesOnly: z
        .boolean()
        .optional()
        .describe('If true, only removes uploaded files but keeps the result entry data')
    })
  )
  .output(
    z.object({
      resultId: z.string().describe('The ID of the removed result entry'),
      filesOnly: z.boolean().describe('Whether only files were removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    let filesOnly = ctx.input.filesOnly || false;
    ctx.progress(filesOnly ? 'Removing files from result...' : 'Removing result...');
    await client.removeResult(ctx.input.resultId, filesOnly);

    return {
      output: {
        resultId: ctx.input.resultId,
        filesOnly
      },
      message: filesOnly
        ? `Successfully removed files from result **${ctx.input.resultId}**.`
        : `Successfully removed result **${ctx.input.resultId}**.`
    };
  })
  .build();
