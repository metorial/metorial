import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let getSignatureProof = SlateTool.create(spec, {
  name: 'Get Signature Proof',
  key: 'get_signature_proof',
  description:
    'Prepare a downloadable signature proof for a signed document, optionally including signature images.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      documentId: z.string().min(1).describe('ID of the signed document'),
      includeImages: z
        .boolean()
        .optional()
        .describe('Also prepare downloadable signature images'),
      signatureType: z
        .enum(['PDF_WITH_SIGNATURES', 'ADVANCED_LEGAL_KIT', 'SIGNED_DATA'])
        .default('PDF_WITH_SIGNATURES')
        .describe('Proof format supported by the document')
    })
  )
  .output(
    z.object({
      documentId: z.string().describe('Document ID'),
      images: z
        .any()
        .optional()
        .describe('Signature image response from IgniSign, including base64 image data')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.auth.appId ?? ctx.config.appId,
      appEnv: ctx.auth.appEnv ?? ctx.config.appEnv
    });
    await client.getDocument(ctx.input.documentId);
    let images: Awaited<ReturnType<IgnisignClient['getSignatureImages']>> | undefined;
    if (ctx.input.includeImages) {
      let result = await client.getSignatureImages(ctx.input.documentId);
      if (!Array.isArray(result.signatures))
        throw createApiServiceError('IgniSign returned an invalid signature image response.');
      images = result;
      for (let signature of result.signatures) {
        if (typeof signature.imgB64 !== 'string' || typeof signature.signerId !== 'string')
          throw createApiServiceError('IgniSign returned an invalid signature image.');
        let dataUrl = signature.imgB64.match(/^data:(image\/[^;]+);base64,(.*)$/s);
        let image = dataUrl?.[2] ?? signature.imgB64;
        await ctx.addAttachment({
          type: 'content',
          content: Buffer.from(image, 'base64'),
          filename: `signature-${signature.signerId}`,
          mimeType: dataUrl?.[1]
        });
      }
    }
    await ctx.addAttachment({
      type: 'url',
      url: `https://api.ignisign.io/v4/documents/${encodeURIComponent(ctx.input.documentId)}/signature-type/${ctx.input.signatureType}`,
      headers: { Authorization: `Bearer ${ctx.auth.token}` },
      ...(ctx.input.signatureType === 'PDF_WITH_SIGNATURES'
        ? { mimeType: 'application/pdf' }
        : {})
    });
    return {
      output: { documentId: ctx.input.documentId, images },
      message: `Prepared signature proof for document **${ctx.input.documentId}** for download.`
    };
  })
  .build();
