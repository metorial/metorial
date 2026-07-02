import { SlateTool } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { spec } from '../spec';

export let uploadAsset = SlateTool.create(spec, {
  name: 'Upload Asset',
  key: 'upload_asset',
  description: `Upload an image or file asset to Sanity's Content Lake. Assets are stored alongside structured content and can be referenced from documents. Images support on-the-fly transformations (resizing, cropping, format conversion) via the CDN.`,
  instructions: [
    'Provide the file content as a base64-encoded string in the "contentBase64" field.',
    'Set assetType to "image" for image files or "file" for other file types like PDFs.',
    'The uploaded asset will return a reference ID that you can use in document fields.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      assetType: z
        .enum(['image', 'file'])
        .describe(
          'Type of asset to upload: "image" for images, "file" for other files (PDFs, videos, etc).'
        ),
      contentBase64: z.string().describe('Base64-encoded file content.'),
      filename: z.string().optional().describe('Original filename for the asset.'),
      contentType: z
        .string()
        .optional()
        .describe('MIME type of the file (e.g., "image/png", "application/pdf").')
    })
  )
  .output(
    z.object({
      document: z
        .object({
          assetId: z.string().describe('The asset document ID.'),
          url: z.string().optional().describe('CDN URL of the uploaded asset.'),
          mimeType: z.string().optional().describe('MIME type of the asset.'),
          size: z.number().optional().describe('File size in bytes.'),
          originalFilename: z.string().optional().describe('Original filename.')
        })
        .passthrough()
        .describe('The created asset document.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SanityClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      dataset: ctx.config.dataset,
      apiVersion: ctx.config.apiVersion
    });

    let binaryString = atob(ctx.input.contentBase64);
    let bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    let buffer = bytes.buffer as ArrayBuffer;

    let response: any;
    if (ctx.input.assetType === 'image') {
      response = await client.uploadImage(buffer, ctx.input.filename, ctx.input.contentType);
    } else {
      response = await client.uploadFile(buffer, ctx.input.filename, ctx.input.contentType);
    }

    let doc = response.document || response;

    return {
      output: {
        document: {
          assetId: doc._id,
          url: doc.url,
          mimeType: doc.mimeType,
          size: doc.size,
          originalFilename: doc.originalFilename,
          ...doc
        }
      },
      message: `Uploaded ${ctx.input.assetType} asset${ctx.input.filename ? ` **${ctx.input.filename}**` : ''}. Asset ID: \`${doc._id}\`.`
    };
  })
  .build();
