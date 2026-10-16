import { getResponseHeaderValue, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { preparePdf, prepareRenderFiles } from '../lib/files';
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
      name: z.string().optional().describe('Name for the merged PDF'),
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
      url: z.string().optional().describe('URL of the merged PDF (when hosted=true)'),
      raw: z.unknown().optional().describe('Complete hosted provider response'),
      fileName: z.string().optional(),
      mimeType: z.string().optional(),
      size: z.number().optional(),
      httpStatus: z.number().optional().describe('Observed provider HTTP response status'),
      declaredSize: z.number().optional().describe('Provider-declared response size in bytes'),
      filePreparationWarning: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    let response = await client.mergeRenders({
      ids: ctx.input.renderIds,
      urls: ctx.input.pdfUrls,
      host: ctx.input.hosted,
      name: ctx.input.name
    });

    if (ctx.input.hosted === true) {
      let result = response.data;
      let warnings = await prepareRenderFiles(ctx, result);
      return {
        output: {
          url: result.url,
          raw: result,
          filePreparationWarning: warnings.length ? warnings.join(' ') : undefined
        },
        message: `Templated merged **${ctx.input.renderIds.length}** render(s) into a single PDF.${result.url ? ` URL: ${result.url}` : ''}${warnings.length ? ` ${warnings.join(' ')}` : ''}`
      };
    }

    let fileName = `${ctx.input.name || 'merged_renders'}.pdf`;
    let contentType = getResponseHeaderValue(response.headers, 'content-type');
    let contentLength = getResponseHeaderValue(response.headers, 'content-length');
    let parsedSize =
      contentLength && /^\d+$/.test(contentLength) ? Number(contentLength) : undefined;
    let declaredSize =
      parsedSize !== undefined && Number.isSafeInteger(parsedSize) ? parsedSize : undefined;
    let result = await preparePdf(ctx, response.data, contentType, fileName, declaredSize);
    if (result.ok) {
      return {
        output: {
          fileName,
          mimeType: 'application/pdf',
          size: result.size,
          httpStatus: response.status,
          declaredSize
        },
        message: `Templated returned HTTP ${response.status}. The PDF content was read and validated for download.`
      };
    }
    let reasons = {
      limit:
        'PDF preparation stopped at the 50 MiB limit before the full response was read; merge completion is unconfirmed.',
      incomplete: 'The PDF response could not be fully read; merge completion is unconfirmed.',
      invalid:
        'The response did not contain a complete supported PDF; merge completion is unconfirmed.',
      preparation: 'The PDF content was read and validated, but download preparation failed.'
    };
    let warning = `Templated returned HTTP ${response.status}. ${reasons[result.reason]} The merge was not repeated; do not repeat it solely to retry file preparation.`;
    return {
      output: {
        httpStatus: response.status,
        declaredSize,
        mimeType: contentType?.split(';')[0]?.trim(),
        filePreparationWarning: warning
      },
      message: warning
    };
  })
  .build();
