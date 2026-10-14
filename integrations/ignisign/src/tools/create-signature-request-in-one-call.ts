import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let createSignatureRequestInOneCall = SlateTool.create(spec, {
  name: 'Create Signature Request in One Call',
  key: 'create_signature_request_in_one_call',
  description:
    'Create and publish a signature request with document files and signer email addresses in one call.',
  tags: { readOnly: false }
})
  .input(
    z.object({
      title: z.string().min(1).describe('Signature request title'),
      signatureMethod: z
        .string()
        .min(1)
        .describe('Supported signature method, for example SIMPLE_STD'),
      signers: z
        .array(
          z.object({
            email: z.string().email(),
            firstName: z.string().optional(),
            lastName: z.string().optional(),
            signerProfileId: z.string().optional()
          })
        )
        .min(1),
      documents: z
        .array(
          z.object({
            originalName: z.string().min(1).describe('File name including extension'),
            mimeType: z.string().min(1),
            base64: z
              .string()
              .optional()
              .describe('Base64 file content; provide exactly one of base64 or url'),
            url: z
              .string()
              .url()
              .optional()
              .describe('Public file URL; provide exactly one of url or base64')
          })
        )
        .min(1)
    })
  )
  .output(
    z.object({
      signatureRequestId: z.string(),
      status: z.string().optional(),
      context: z.any()
    })
  )
  .handleInvocation(async ctx => {
    for (let document of ctx.input.documents) {
      if (Boolean(document.base64) === Boolean(document.url))
        throw createApiServiceError('Each document requires exactly one of base64 or url.');
    }
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.auth.appId ?? ctx.config.appId,
      appEnv: ctx.auth.appEnv ?? ctx.config.appEnv
    });
    let context = await client.oneCallSign(ctx.input);
    let signatureRequestId = context.signatureRequestId ?? context._id;
    if (!signatureRequestId)
      throw createApiServiceError('IgniSign did not return a signature request ID.');
    return {
      output: { signatureRequestId, status: context.status, context },
      message: `Created signature request **${signatureRequestId}**.`
    };
  })
  .build();
