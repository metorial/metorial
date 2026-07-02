import { createBase64Attachment, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taggunServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageProductCategories = SlateTool.create(spec, {
  name: 'Manage Product Categories',
  key: 'manage_product_categories',
  description: `Export or upload the product categorization list Taggun uses for product-level purchase categorization.

Use **export** to retrieve the currently saved product categories. Use **upload** to replace or modify categories with a CSV or TSV file.`,
  instructions: [
    'Use CSV or TSV content for uploads.',
    'Uploading product categories changes account-level categorization behavior; export current categories first if the account supports a file response.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['export', 'upload']).describe('Product category action to perform'),
      fileName: z.string().optional().describe('CSV or TSV filename. Required for upload.'),
      contentBase64: z
        .string()
        .optional()
        .describe('Base64-encoded CSV or TSV file content. Required for upload.'),
      contentType: z
        .string()
        .optional()
        .default('text/csv')
        .describe('MIME type of the uploaded categories file.')
    })
  )
  .output(
    z.object({
      action: z.enum(['export', 'upload']).describe('Action that was performed'),
      result: z.any().nullable().optional().describe('Taggun JSON result, when returned'),
      contentType: z.string().nullable().optional().describe('Exported file MIME type'),
      sizeBytes: z.number().nullable().optional().describe('Exported file byte size'),
      attachmentCount: z
        .number()
        .describe('Number of Slate attachments returned for exported file content'),
      uploaded: z.boolean().nullable().optional().describe('Whether upload completed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'export') {
      let result = await client.exportProductCategories();
      let hasAttachment = !!result.contentBase64;

      return {
        output: {
          action: ctx.input.action,
          result: result.result ?? null,
          contentType: result.contentType,
          sizeBytes: result.sizeBytes,
          attachmentCount: hasAttachment ? 1 : 0,
          uploaded: null
        },
        attachments: hasAttachment
          ? [createBase64Attachment(result.contentBase64!, result.contentType)]
          : undefined,
        message: hasAttachment
          ? `Exported product categories (${result.sizeBytes} bytes).`
          : 'Requested product category export.'
      };
    }

    if (!ctx.input.fileName || !ctx.input.contentBase64) {
      throw taggunServiceError('fileName and contentBase64 are required for upload action.');
    }

    let result = await client.uploadProductCategories({
      filename: ctx.input.fileName,
      contentBase64: ctx.input.contentBase64,
      contentType: ctx.input.contentType
    });

    return {
      output: {
        action: ctx.input.action,
        result: result?.result ?? null,
        contentType: null,
        sizeBytes: null,
        attachmentCount: 0,
        uploaded: true
      },
      message: `Uploaded product categories file **${ctx.input.fileName}**.`
    };
  })
  .build();
