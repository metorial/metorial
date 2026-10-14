import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let fillDocument = SlateTool.create(spec, {
  name: 'Fill Document Template',
  key: 'fill_document',
  description: `Fill a document template (PDF, DOCX, or XLSX) with field values and optionally route it for e-signature. Provides the generated document for download.`
})
  .input(
    z.object({
      documentId: z.string().describe('UUID of the document template to fill'),
      fieldValues: z
        .record(z.string(), z.any())
        .describe('Key-value mapping of template fields to fill values'),
      signerEmail: z
        .string()
        .optional()
        .describe('Email address to route the document to for signature'),
      userId: z.string().optional().describe('User ID to associate the filled document with')
    })
  )
  .output(
    z.object({
      fileUrl: z.string().optional().describe('URL to the generated document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FeatheryClient({
      token: ctx.auth.token,
      region:
        ctx.auth.region ??
        ('region' in ctx.config && typeof ctx.config.region === 'string'
          ? ctx.config.region
          : undefined)
    });

    let result = await client.fillDocument({
      documentId: ctx.input.documentId,
      fieldValues: ctx.input.fieldValues,
      signerEmail: ctx.input.signerEmail,
      userId: ctx.input.userId
    });

    let fileUrl = result.file_url || result.url;
    if (
      typeof fileUrl !== 'string' ||
      !URL.canParse(fileUrl) ||
      !['http:', 'https:'].includes(new URL(fileUrl).protocol)
    ) {
      throw createApiServiceError(
        'Feathery did not return a generated document URL. Check the document template and retry.'
      );
    }
    await ctx.addAttachment({ type: 'url', url: fileUrl });

    return {
      output: {
        fileUrl
      },
      message: `Filled document template **${ctx.input.documentId}**${ctx.input.signerEmail ? ` and routed to ${ctx.input.signerEmail} for signature` : ''}.`
    };
  })
  .build();
