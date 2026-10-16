import { SlateTool } from 'slates';
import { z } from 'zod';
import { NeutrinoClient } from '../lib/client';
import { spec } from '../spec';

const fileOutput = z.object({
  generated: z.boolean().describe('Whether the provider returned a validated file'),
  filename: z.string().describe('Suggested download filename'),
  mimeType: z.string().describe('Validated file MIME type'),
  size: z.number().describe('File size in bytes'),
  deliveryStatus: z
    .enum(['requested', 'failed'])
    .describe('Download request status; file availability remains unconfirmed'),
  deliveryWarning: z
    .string()
    .optional()
    .describe('Download availability warning after the provider generated the file')
});

// Direct binary responses have no expiring download URL and need no regeneration for renewal.
const requestDownload = async (
  addFile: (file: {
    type: 'content';
    content: Response;
    filename: string;
    mimeType: string;
  }) => Promise<unknown>,
  file: { content: Response; size: number; mimeType: string },
  filename: string
) => {
  try {
    await addFile({
      type: 'content',
      content: file.content,
      filename,
      mimeType: file.mimeType
    });
    return {
      generated: true,
      filename,
      mimeType: file.mimeType,
      size: file.size,
      deliveryStatus: 'requested' as const,
      deliveryWarning:
        'The provider generated the file and its download was requested. Availability is unconfirmed; check whether the file is available before retrying, as another request may consume API credit.'
    };
  } catch {
    return {
      generated: true,
      filename,
      mimeType: file.mimeType,
      size: file.size,
      deliveryStatus: 'failed' as const,
      deliveryWarning:
        'The provider generated the file, but requesting its download failed. The request may have consumed API credit; check your account before retrying.'
    };
  }
};

export const qrCodeTool = SlateTool.create(spec, {
  key: 'generate_qr_code',
  name: 'Generate QR Code or Barcode',
  description: 'Generate a downloadable PNG QR code or Code 128 barcode.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      content: z.string().describe('Text, URL, or other value to encode'),
      width: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Width in pixels; provider default is 256'),
      height: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Height in pixels; provider default is 256'),
      foregroundColor: z.string().optional().describe('Foreground color, such as #000000'),
      backgroundColor: z.string().optional().describe('Background color, such as #ffffff'),
      codeFormat: z
        .enum(['qr', 'c128'])
        .optional()
        .describe('qr for QR code or c128 for Code 128 barcode')
    })
  )
  .output(fileOutput)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let file = await new NeutrinoClient(ctx.auth).file(
      '/qr-code',
      {
        content: input.content,
        width: input.width,
        height: input.height,
        'fg-color': input.foregroundColor,
        'bg-color': input.backgroundColor,
        'code-format': input.codeFormat
      },
      'image/png'
    );
    let output = await requestDownload(file => ctx.addAttachment(file), file, 'code.png');
    return {
      output,
      message: output.deliveryWarning
    };
  })
  .build();

export const renderHtmlTool = SlateTool.create(spec, {
  key: 'render_html',
  name: 'Render HTML to File',
  description: 'Render an HTML string or URL to a downloadable PDF, PNG, or JPG file.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      content: z.string().describe('HTML content string or URL to render'),
      format: z
        .enum(['PDF', 'PNG', 'JPG'])
        .optional()
        .describe('Output format; provider default is PDF'),
      pageSize: z
        .string()
        .optional()
        .describe('PDF page size: A0-A9, B0-B10, Comm10E, DLE, or Letter'),
      title: z.string().optional().describe('Document title'),
      margin: z.number().nonnegative().optional().describe('Page margin in millimeters'),
      landscape: z.boolean().optional().describe('Use landscape orientation'),
      zoom: z.number().positive().optional().describe('Page zoom factor'),
      grayscale: z.boolean().optional().describe('Render in grayscale'),
      css: z.string().optional().describe('Custom CSS to inject'),
      imageWidth: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('PNG or JPG width in pixels'),
      imageHeight: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('PNG or JPG height in pixels; omitted height is automatic'),
      delay: z
        .number()
        .int()
        .nonnegative()
        .optional()
        .describe('Seconds to wait before rendering'),
      timeout: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Seconds allowed for loading HTML; provider default is 300'),
      header: z.string().optional().describe('HTML page header'),
      footer: z.string().optional().describe('HTML page footer'),
      backgroundColor: z
        .string()
        .optional()
        .describe('Image background color; PNG also supports transparent')
    })
  )
  .output(fileOutput)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let format = input.format ?? 'PDF';
    let mimeType =
      format === 'PDF' ? 'application/pdf' : format === 'PNG' ? 'image/png' : 'image/jpeg';
    let file = await new NeutrinoClient(ctx.auth).file(
      '/html-render',
      {
        content: input.content,
        format,
        'page-size': input.pageSize,
        title: input.title,
        margin: input.margin,
        landscape: input.landscape,
        zoom: input.zoom,
        grayscale: input.grayscale,
        css: input.css,
        'image-width': input.imageWidth,
        'image-height': input.imageHeight,
        delay: input.delay,
        timeout: input.timeout,
        header: input.header,
        footer: input.footer,
        'bg-color': input.backgroundColor
      },
      mimeType
    );
    let output = await requestDownload(
      file => ctx.addAttachment(file),
      file,
      `render.${format.toLowerCase()}`
    );
    return {
      output,
      message: output.deliveryWarning
    };
  })
  .build();

export const resizeImageTool = SlateTool.create(spec, {
  key: 'resize_image',
  name: 'Resize Image',
  description:
    'Resize an image from a source URL or base64 data URL to a downloadable PNG or JPG file.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      imageUrl: z.string().describe('Image URL or base64 data URL'),
      width: z.number().int().positive().describe('Target width in pixels'),
      height: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Target height in pixels; omitted height preserves aspect ratio'),
      format: z
        .enum(['png', 'jpg'])
        .optional()
        .describe('Output format; provider default is png'),
      resizeMode: z
        .enum(['scale', 'pad', 'crop'])
        .optional()
        .describe('Aspect-ratio behavior; provider default is scale'),
      backgroundColor: z
        .string()
        .optional()
        .describe('Background color for padding; PNG also supports transparent')
    })
  )
  .output(fileOutput)
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let format = input.format ?? 'png';
    let file = await new NeutrinoClient(ctx.auth).file(
      '/image-resize',
      {
        'image-url': input.imageUrl,
        width: input.width,
        height: input.height,
        format,
        'resize-mode': input.resizeMode,
        'bg-color': input.backgroundColor
      },
      format === 'png' ? 'image/png' : 'image/jpeg'
    );
    let output = await requestDownload(
      file => ctx.addAttachment(file),
      file,
      `resized.${format}`
    );
    return { output, message: output.deliveryWarning };
  })
  .build();
