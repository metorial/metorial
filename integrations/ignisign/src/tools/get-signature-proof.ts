import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let getSignatureProof = SlateTool.create(spec, {
  name: 'Get Signature Proof',
  key: 'get_signature_proof',
  description: `Retrieve signature proof artifacts for a signed document, including signature images (base64) and low-level cryptographic proofs. Use this after a document has been signed to get proof evidence.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      documentId: z.string().describe('ID of the signed document'),
      includeImages: z
        .boolean()
        .optional()
        .describe('If true, also fetch signature image representations (base64)')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      images: z.any().optional().describe('Signature images in base64 format')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let images: any;
    if (ctx.input.includeImages) {
      images = await client.getSignatureImages(ctx.input.documentId);
    }

    return {
      output: {
        documentId: ctx.input.documentId,
        images
      },
      message: `Retrieved signature proof artifacts for document **${ctx.input.documentId}**.`
    };
  })
  .build();
