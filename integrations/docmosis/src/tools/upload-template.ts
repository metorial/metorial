import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { asBoolean, asNumber, Client } from '../lib/client';
import { spec } from '../spec';

export let uploadTemplate = SlateTool.create(spec, {
  name: 'Upload Template',
  key: 'upload_template',
  description:
    'Upload a document template for rendering. Uploading to an existing template path replaces it. Use keepPrevOnFail with devMode false to retain a working template if the replacement has errors.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      filename: z
        .string()
        .min(1)
        .describe('Filename of the template being uploaded, such as invoice.docx'),
      contentBase64: z.string().min(1).describe('The template file bytes encoded as base64'),
      templateName: z
        .string()
        .optional()
        .describe('Optional overriding template path, such as /invoices/invoice.docx'),
      templateDescription: z
        .string()
        .optional()
        .describe('Optional description of the template'),
      devMode: z
        .boolean()
        .optional()
        .describe('Allow upload of templates with errors; defaults to true'),
      keepPrevOnFail: z
        .boolean()
        .optional()
        .describe(
          'When devMode is false, retain the previous template if the new template has errors'
        )
    })
  )
  .output(
    z.object({
      succeeded: z.boolean(),
      templateName: z.string(),
      sizeBytes: z.number().optional(),
      lastModifiedTime: z.number().optional(),
      templateHasErrors: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let encoded = ctx.input.contentBase64.replace(/\s/g, '');
    if (!/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(encoded)) {
      throw createApiServiceError('Provide the template file as valid base64.');
    }
    let content = Buffer.from(encoded, 'base64');
    if (!content.byteLength)
      throw createApiServiceError('The template file must not be empty.');
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.uploadTemplate({
      filename: ctx.input.filename,
      content,
      templateName: ctx.input.templateName,
      templateDescription: ctx.input.templateDescription,
      devMode: ctx.input.devMode,
      keepPrevOnFail: ctx.input.keepPrevOnFail
    });
    let details = result.templateDetails;
    return {
      output: {
        succeeded: result.succeeded,
        templateName: details?.name || ctx.input.templateName || ctx.input.filename,
        sizeBytes: asNumber(details?.sizeBytes),
        lastModifiedTime: asNumber(details?.lastModifiedMillisSinceEpoch),
        templateHasErrors: asBoolean(details?.templateHasErrors)
      },
      message: `Uploaded template \`${details?.name || ctx.input.templateName || ctx.input.filename}\`.`
    };
  })
  .build();
