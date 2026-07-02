import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createProofRequest = SlateTool.create(spec, {
  name: 'Create Proof Request',
  key: 'create_proof_request',
  description: `Generate a proof request for credential verification. Can be created from an existing proof template or as a standalone request with custom PEX input descriptors. Returns a URL/QR code that can be shared with the credential holder.`,
  instructions: [
    'Provide either a templateId to create from an existing template, or provide inputDescriptors for a standalone request.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      requestName: z.string().describe('Name for the proof request'),
      templateId: z
        .string()
        .optional()
        .describe('ID of a proof template to base this request on'),
      purpose: z.string().optional().describe('Purpose description for the verification'),
      inputDescriptors: z
        .array(z.any())
        .optional()
        .describe('DIF Presentation Exchange input descriptors (for standalone requests)'),
      verifierDid: z.string().optional().describe('DID of the verifier'),
      nonce: z.string().optional().describe('Optional nonce for replay protection')
    })
  )
  .output(
    z.object({
      proofRequestId: z.string().describe('ID of the created proof request'),
      responseUrl: z.string().optional().describe('URL for the holder to submit their proof'),
      qrCode: z.string().optional().describe('QR code data for mobile wallet scanning'),
      proofRequest: z.any().describe('Full proof request details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result: any;

    if (ctx.input.templateId) {
      result = await client.createProofRequestFromTemplate(ctx.input.templateId, {
        name: ctx.input.requestName,
        did: ctx.input.verifierDid,
        nonce: ctx.input.nonce
      });
    } else {
      result = await client.createProofRequest({
        name: ctx.input.requestName,
        did: ctx.input.verifierDid,
        nonce: ctx.input.nonce,
        request: ctx.input.inputDescriptors
          ? {
              name: ctx.input.requestName,
              purpose: ctx.input.purpose,
              input_descriptors: ctx.input.inputDescriptors
            }
          : undefined
      });
    }

    return {
      output: {
        proofRequestId: result?.id || '',
        responseUrl: result?.response_url,
        qrCode: result?.qr,
        proofRequest: result
      },
      message: `Created proof request **${result?.id}**${ctx.input.templateId ? ` from template ${ctx.input.templateId}` : ''}.`
    };
  })
  .build();
