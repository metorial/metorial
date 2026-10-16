import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let downloadCertificate = SlateTool.create(spec, {
  name: 'Download Certificate',
  key: 'download_certificate',
  description:
    'Download an exam taker’s certificate PDF using the certificateUrl returned by get_exam_results.',
  instructions: [
    'Certificates depend on exam settings and may only be available for passing results.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      certificateUrl: z
        .string()
        .describe(
          'The complete certificateUrl returned by get_exam_results; preserve its query parameters'
        )
    })
  )
  .output(
    z.object({
      certificateUrl: z.string().describe('ClassMarker certificate URL'),
      mimeType: z.string().describe('Certificate file media type')
    })
  )
  .handleInvocation(async ctx => {
    let url: URL;
    try {
      url = new URL(ctx.input.certificateUrl);
    } catch {
      throw createApiServiceError(
        'Provide the complete ClassMarker certificateUrl from get_exam_results.'
      );
    }
    if (
      url.protocol !== 'https:' ||
      url.hostname !== 'www.classmarker.com' ||
      url.port ||
      url.username ||
      url.password ||
      !url.pathname.startsWith('/pdf/certificate/')
    ) {
      throw createApiServiceError(
        'Use an HTTPS ClassMarker certificate PDF URL from get_exam_results.'
      );
    }
    await ctx.addAttachment({ type: 'url', url: url.toString(), mimeType: 'application/pdf' });
    return {
      output: { certificateUrl: url.toString(), mimeType: 'application/pdf' },
      message: 'Prepared the certificate PDF for download.'
    };
  })
  .build();
