import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { prepareGeneratedFile } from '../lib/files';
import { spec } from '../spec';

export let getResult = SlateTool.create(spec, {
  key: 'get_result',
  name: 'Get Render Result',
  description:
    'Retrieve an existing render result and its original request metadata. Check pending video status, and prepare the completed file for download without generating it again.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      resultId: z
        .string()
        .describe(
          'Result identifier from render_image, take_screenshot, capture_pdf, or list_results'
        )
    })
  )
  .output(
    z.object({
      resultId: z.string(),
      href: z.string().optional(),
      status: z.string().optional(),
      result: z
        .record(z.string(), z.unknown())
        .describe(
          'Result fields returned by RenderForm, including available request, dimensions, failure, and video metadata'
        ),
      downloadPrepared: z
        .boolean()
        .describe(
          'Whether file content was retrieved and prepared for download; availability remains unverified'
        ),
      downloadWarning: z
        .string()
        .describe('File readiness, preparation, or availability information')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new Client(ctx.auth.token).getResult(ctx.input.resultId);
    let download =
      result.href && result.status === 'done'
        ? await prepareGeneratedFile(ctx, {
            requestId: result.identifier,
            href: result.href,
            status: result.status
          })
        : {
            downloadPrepared: false,
            downloadWarning:
              'The provider has not confirmed a completed downloadable file. Check its reported status and retry get_result when ready.'
          };
    return {
      output: {
        resultId: result.identifier,
        href: result.href,
        status: result.status,
        result,
        ...download
      },
      message: `Retrieved render result ${result.identifier}. ${download.downloadWarning}`
    };
  })
  .build();
