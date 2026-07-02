import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';
import { fileAttachment, fileAttachmentOutputSchema, fileOutput } from './shared';

export let signPdf = SlateTool.create(spec, {
  name: 'Sign PDF',
  key: 'sign_pdf',
  description:
    'Add a visible image-based signature to a PDF. Provide a signature image and configure page range, alignment, size, margins, opacity, and layering.',
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      signatureImageContent: z.string().describe('Base64-encoded signature image content'),
      signatureImageName: z.string().describe('Signature image file name, e.g. signature.png'),
      alignX: z
        .enum(['Left', 'Center', 'Right'])
        .default('Right')
        .describe('Horizontal signature alignment'),
      alignY: z
        .enum(['Top', 'Middle', 'Bottom'])
        .default('Bottom')
        .describe('Vertical signature alignment'),
      pages: z.string().optional().describe('Pages to sign, e.g. "1", "1,3", "2-5"'),
      widthInMM: z.string().optional().describe('Signature width in millimeters'),
      heightInMM: z.string().optional().describe('Signature height in millimeters'),
      widthInPx: z.string().optional().describe('Signature width in pixels'),
      heightInPx: z.string().optional().describe('Signature height in pixels'),
      marginXInMM: z.string().optional().describe('Horizontal margin in millimeters'),
      marginYInMM: z.string().optional().describe('Vertical margin in millimeters'),
      marginXInPx: z.string().optional().describe('Horizontal margin in pixels'),
      marginYInPx: z.string().optional().describe('Vertical margin in pixels'),
      opacity: z
        .number()
        .min(0)
        .max(100)
        .default(100)
        .describe('Signature opacity from 0-100'),
      showOnlyInPrint: z.boolean().optional().describe('Show signature only when printing'),
      isBackground: z.boolean().optional().describe('Place the signature behind page content')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.signPdf({
      docContent: ctx.input.fileContent,
      docName: ctx.input.fileName,
      imageFile: ctx.input.signatureImageContent,
      imageName: ctx.input.signatureImageName,
      alignX: ctx.input.alignX,
      alignY: ctx.input.alignY,
      pages: ctx.input.pages,
      widthInMM: ctx.input.widthInMM,
      heightInMM: ctx.input.heightInMM,
      widthInPx: ctx.input.widthInPx,
      heightInPx: ctx.input.heightInPx,
      marginXInMM: ctx.input.marginXInMM,
      marginYInMM: ctx.input.marginYInMM,
      marginXInPx: ctx.input.marginXInPx,
      marginYInPx: ctx.input.marginYInPx,
      opacity: String(ctx.input.opacity),
      showOnlyInPrint: ctx.input.showOnlyInPrint,
      isBackground: ctx.input.isBackground
    });

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Added signature to **${result.fileName}**`
    };
  })
  .build();
