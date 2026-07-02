import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getEmbeddedSignLink = SlateTool.create(spec, {
  name: 'Get Embedded Sign Link',
  key: 'get_embedded_sign_link',
  description: `Generate an embedded signing link for a specific signer on a document. The link can be used to embed the signing experience in an iFrame or popup window within your application.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('The ID of the document'),
      signerEmail: z.string().describe('Email address of the signer to generate the link for'),
      redirectUrl: z
        .string()
        .optional()
        .describe('URL to redirect the signer to after signing')
    })
  )
  .output(
    z.object({
      signLink: z.string().describe('The embedded signing URL')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      region: ctx.config.region
    });

    let result = await client.getEmbeddedSignLink(ctx.input);

    return {
      output: result,
      message: `Embedded signing link generated for **${ctx.input.signerEmail}** on document **${ctx.input.documentId}**.`
    };
  })
  .build();
