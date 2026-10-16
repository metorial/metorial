import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let generateCredentialPdf = SlateTool.create(spec, {
  name: 'Generate Credential PDF',
  key: 'generate_credential_pdf',
  description: 'Generate a downloadable PDF for a published credential.',
  constraints: ['The credential must already be published.'],
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      credentialId: z
        .string()
        .describe(
          'ID of the published credential. Use search_credentials to discover credentials.'
        )
    })
  )
  .output(
    z.object({
      credentialId: z.string().describe('ID of the credential used to generate the PDF'),
      mimeType: z.string().describe('Download MIME type')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      environment: ctx.auth.environment ?? (ctx.config as { environment?: string }).environment
    });
    let url = await client.generateCredentialPdf(ctx.input.credentialId);
    await ctx.addAttachment({ type: 'url', url, mimeType: 'application/pdf' });
    return {
      output: { credentialId: ctx.input.credentialId, mimeType: 'application/pdf' },
      message: `Prepared a PDF for credential **${ctx.input.credentialId}**.`
    };
  })
  .build();
