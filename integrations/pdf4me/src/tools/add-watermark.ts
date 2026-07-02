import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { pdf4meServiceError } from '../lib/errors';
import { spec } from '../spec';
import {
  fileAttachment,
  fileAttachmentOutputSchema,
  fileOutput,
  type Pdf4meFileResult
} from './shared';

export let addWatermark = SlateTool.create(spec, {
  name: 'Add Watermark',
  key: 'add_watermark',
  description: `Add a text or image watermark/stamp to a PDF document. Control position, size, transparency, rotation, and more.
Use text watermarks for labels like "DRAFT" or "CONFIDENTIAL", or image watermarks for logos and signatures.`,
  tags: {
    readOnly: false
  }
})
  .input(
    z.object({
      fileContent: z.string().describe('Base64-encoded PDF file content'),
      fileName: z.string().describe('PDF file name with extension'),
      watermarkType: z.enum(['text', 'image']).describe('Type of watermark to add'),
      pages: z
        .string()
        .default('all')
        .describe('Pages to apply the watermark (e.g. "1,2,3" or "all")'),
      alignX: z
        .enum(['Left', 'Center', 'Right'])
        .default('Center')
        .describe('Horizontal alignment'),
      alignY: z
        .enum(['Top', 'Middle', 'Bottom'])
        .default('Middle')
        .describe('Vertical alignment'),
      text: z.string().optional().describe('Watermark text (required for text watermarks)'),
      fontSize: z.number().optional().describe('Font size for text watermark'),
      fontColor: z
        .string()
        .optional()
        .describe('Font color for text watermark (e.g. "#FF0000")'),
      isBold: z.boolean().optional().describe('Bold text'),
      isItalics: z.boolean().optional().describe('Italic text'),
      underline: z.boolean().optional().describe('Underline text'),
      rotate: z.number().optional().describe('Rotation angle in degrees (0-360)'),
      transverse: z.boolean().optional().describe('Set text diagonally across the page'),
      fitTextOverPage: z.boolean().optional().describe('Scale text to fit the entire page'),
      imageContent: z
        .string()
        .optional()
        .describe('Base64-encoded image content (required for image watermarks)'),
      imageName: z
        .string()
        .optional()
        .describe('Image file name with extension (required for image watermarks)'),
      heightInMM: z
        .string()
        .optional()
        .default('0')
        .describe('Watermark height in mm ("0" for auto)'),
      widthInMM: z
        .string()
        .optional()
        .default('0')
        .describe('Watermark width in mm ("0" for auto)'),
      marginXInMM: z.string().optional().default('0').describe('Horizontal margin in mm'),
      marginYInMM: z.string().optional().default('0').describe('Vertical margin in mm'),
      opacity: z
        .number()
        .min(0)
        .max(100)
        .default(100)
        .describe('Transparency: 0 (invisible) to 100 (fully opaque)'),
      showOnlyInPrint: z.boolean().optional().describe('Show watermark only when printing')
    })
  )
  .output(fileAttachmentOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result: Pdf4meFileResult;

    if (ctx.input.watermarkType === 'image') {
      if (!ctx.input.imageContent || !ctx.input.imageName) {
        throw pdf4meServiceError(
          'imageContent and imageName are required for image watermarks'
        );
      }
      result = await client.imageStamp({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        imageFile: ctx.input.imageContent,
        imageName: ctx.input.imageName,
        pages: ctx.input.pages,
        alignX: ctx.input.alignX,
        alignY: ctx.input.alignY,
        heightInMM: ctx.input.heightInMM ?? '0',
        widthInMM: ctx.input.widthInMM ?? '0',
        marginXInMM: ctx.input.marginXInMM ?? '0',
        marginYInMM: ctx.input.marginYInMM ?? '0',
        opacity: ctx.input.opacity,
        showOnlyInPrint: ctx.input.showOnlyInPrint
      });
    } else {
      if (!ctx.input.text) {
        throw pdf4meServiceError('text is required for text watermarks');
      }
      result = await client.textStamp({
        docContent: ctx.input.fileContent,
        docName: ctx.input.fileName,
        text: ctx.input.text,
        pages: ctx.input.pages,
        alignX: ctx.input.alignX,
        alignY: ctx.input.alignY,
        fontSize: ctx.input.fontSize,
        fontColor: ctx.input.fontColor,
        isBold: ctx.input.isBold,
        isItalics: ctx.input.isItalics,
        underline: ctx.input.underline,
        marginXInMM: ctx.input.marginXInMM,
        marginYInMM: ctx.input.marginYInMM,
        opacity: ctx.input.opacity !== undefined ? String(ctx.input.opacity) : undefined,
        rotate: ctx.input.rotate,
        showOnlyInPrint: ctx.input.showOnlyInPrint,
        transverse: ctx.input.transverse,
        fitTextOverPage: ctx.input.fitTextOverPage
      });
    }

    return {
      output: fileOutput(result, 'application/pdf'),
      attachments: [fileAttachment(result, 'application/pdf')],
      message: `Successfully added ${ctx.input.watermarkType} watermark to **${result.fileName}**`
    };
  })
  .build();
