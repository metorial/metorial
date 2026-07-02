import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getResultPdf = SlateTool.create(spec, {
  name: 'Get Result PDF',
  key: 'get_result_pdf',
  description: `Generates and retrieves a PDF document from a form result entry. Supports configurable paper size, orientation, scaling, margins, and optional password protection. Returns the PDF as an attachment.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resultId: z.string().describe('The unique ID of the result entry to generate a PDF for'),
      paperSize: z
        .enum(['A4', 'A3', 'Letter', 'Legal'])
        .optional()
        .describe('Paper size for the PDF'),
      orientation: z.enum(['portrait', 'landscape']).optional().describe('Page orientation'),
      scale: z.string().optional().describe('Scale percentage (e.g., "100")'),
      marginTop: z.string().optional().describe('Top margin in mm'),
      marginRight: z.string().optional().describe('Right margin in mm'),
      marginBottom: z.string().optional().describe('Bottom margin in mm'),
      marginLeft: z.string().optional().describe('Left margin in mm'),
      password: z.string().optional().describe('Password to protect the PDF document')
    })
  )
  .output(
    z.object({
      contentType: z.string().describe('MIME type of the PDF')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Generating PDF...');
    let result = await client.getResultPdf({
      resultId: ctx.input.resultId,
      paperSize: ctx.input.paperSize,
      orientation: ctx.input.orientation,
      scale: ctx.input.scale,
      marginTop: ctx.input.marginTop,
      marginRight: ctx.input.marginRight,
      marginBottom: ctx.input.marginBottom,
      marginLeft: ctx.input.marginLeft,
      password: ctx.input.password
    });

    return {
      output: {
        contentType: result.contentType
      },
      attachments: [createBase64Attachment(result.content, result.contentType)],
      message: `Successfully generated PDF for result **${ctx.input.resultId}**.`
    };
  })
  .build();
