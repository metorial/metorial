import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prepareGeneratedFile } from '../lib/files';
import { spec } from '../spec';

export let capturePdf = SlateTool.create(spec, {
  key: 'capture_pdf',
  name: 'Capture Website PDF',
  description:
    'Convert a public website URL into a PDF and prepare the generated file for download.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      url: z.string().describe('Full HTTP or HTTPS website URL'),
      format: z
        .enum(['A5', 'A4', 'A3', 'LETTER', 'LEGAL'])
        .optional()
        .describe('Provider PDF page format'),
      waitTime: z
        .number()
        .optional()
        .describe('Milliseconds to wait before capture, from 0 to 5000')
    })
  )
  .output(
    z.object({
      requestId: z.string(),
      href: z.string(),
      downloadPrepared: z
        .boolean()
        .describe(
          'Whether content was retrieved and prepared; download availability remains unverified'
        ),
      downloadWarning: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).capturePdf(ctx.input);
    let download = await prepareGeneratedFile(ctx, result);
    return {
      output: { requestId: result.requestId, href: result.href, ...download },
      message: `PDF request succeeded. ${download.downloadWarning}`
    };
  })
  .build();
