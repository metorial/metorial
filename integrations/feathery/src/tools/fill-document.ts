import { SlateTool } from 'slates';
import { z } from 'zod';
import { FeatheryClient } from '../lib/client';
import { spec } from '../spec';

export let fillDocument = SlateTool.create(spec, {
  name: 'Fill Document Template',
  key: 'fill_document',
  description: `Fill a document template (PDF, DOCX, or XLSX) with field values and optionally route it for e-signature. Returns the URL of the generated document.`
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
      region: ctx.config.region
    });

    let result = await client.fillDocument({
      documentId: ctx.input.documentId,
      fieldValues: ctx.input.fieldValues,
      signerEmail: ctx.input.signerEmail,
      userId: ctx.input.userId
    });

    return {
      output: {
        fileUrl: result.file_url || result.url
      },
      message: `Filled document template **${ctx.input.documentId}**${ctx.input.signerEmail ? ` and routed to ${ctx.input.signerEmail} for signature` : ''}.`
    };
  })
  .build();
