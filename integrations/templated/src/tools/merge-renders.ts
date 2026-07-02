import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let mergeRenders = SlateTool.create(spec, {
  name: 'Merge Renders',
  key: 'merge_renders',
  description: `Merge multiple renders into a single PDF document. You can combine renders by their IDs and optionally include external PDF URLs. The renders are merged in the order specified.`,
  constraints: ['Costs 1 API credit per merge operation.']
})
  .input(
    z.object({
      renderIds: z.array(z.string()).describe('Render IDs to merge, in order'),
      pdfUrls: z
        .array(z.string())
        .optional()
        .describe('Optional external PDF URLs to append after renders'),
      hosted: z
        .boolean()
        .optional()
        .describe(
          'When true, the merged PDF is hosted on Templated servers and a URL is returned. When false (default), the raw PDF is returned.'
        )
    })
  )
  .output(
    z.object({
      url: z.string().optional().describe('URL of the merged PDF (when hosted=true)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let result = await client.mergeRenders({
      ids: ctx.input.renderIds,
      urls: ctx.input.pdfUrls,
      host: ctx.input.hosted
    });

    return {
      output: { url: result.url },
      message: `Merged **${ctx.input.renderIds.length}** render(s) into a single PDF.${result.url ? ` URL: ${result.url}` : ''}`
    };
  })
  .build();
