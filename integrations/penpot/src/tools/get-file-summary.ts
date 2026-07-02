import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getFileSummaryTool = SlateTool.create(spec, {
  name: 'Get File Summary',
  key: 'get_file_summary',
  description: `Get a lightweight summary of a design file's components, variants, colors, and typographies without loading the full file data.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      fileId: z.string().describe('ID of the file to get summary for')
    })
  )
  .output(
    z.object({
      components: z.any().optional().describe('Components summary'),
      variants: z.any().optional().describe('Variants summary'),
      colors: z.any().optional().describe('Colors summary'),
      typographies: z.any().optional().describe('Typographies summary')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ baseUrl: ctx.config.baseUrl, token: ctx.auth.token });
    let summary = await client.getFileSummary(ctx.input.fileId);

    return {
      output: {
        components: summary.components,
        variants: summary.variants,
        colors: summary.colors,
        typographies: summary.typographies
      },
      message: `Retrieved summary for file \`${ctx.input.fileId}\`.`
    };
  })
  .build();
