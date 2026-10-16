import { isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, expectArray } from '../lib/client';
import { spec } from '../spec';

export let getGeneratedFiles = SlateTool.create(spec, {
  name: 'Get Generated Files',
  key: 'get_generated_files',
  description: `Retrieve recently generated files (PDF or Excel exports of form submissions) from DataScope within a date range. Each file includes download URL, form name, user, and creation date.`,
  instructions: ['Dates should be in YYYY-MM-DD format.'],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      start: z.string().optional().describe('Start date for filtering (YYYY-MM-DD)'),
      end: z.string().optional().describe('End date for filtering (YYYY-MM-DD)')
    })
  )
  .output(
    z.object({
      files: z.array(z.any()).describe('Array of generated file records with download URLs'),
      count: z.number().describe('Number of files returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let results = await client.getFiles({
      start: ctx.input.start,
      end: ctx.input.end
    });

    let files = expectArray(results, 'generated files');

    for (let file of files) {
      if (isApiErrorRecord(file) && typeof file.url === 'string') {
        await ctx.addAttachment({ type: 'url', url: file.url });
      }
    }

    return {
      output: {
        files,
        count: files.length
      },
      message: `Retrieved **${files.length}** generated file(s)${ctx.input.start ? ` from ${ctx.input.start}` : ''}${ctx.input.end ? ` to ${ctx.input.end}` : ''}.`
    };
  })
  .build();
