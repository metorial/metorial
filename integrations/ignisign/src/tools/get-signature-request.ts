import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let getSignatureRequest = SlateTool.create(spec, {
  name: 'Get Signature Request',
  key: 'get_signature_request',
  description: `Retrieve the full context of a signature request including its status, associated documents, signers, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      signatureRequestId: z.string().describe('ID of the signature request to retrieve')
    })
  )
  .output(
    z.object({
      signatureRequestId: z.string().describe('Signature request ID'),
      status: z.string().optional().describe('Current status'),
      title: z.string().optional().describe('Title'),
      description: z.string().optional().describe('Description'),
      externalId: z.string().optional().describe('External reference ID'),
      signatureProfileId: z.string().optional().describe('Signature profile used'),
      documentIds: z.array(z.string()).optional().describe('Associated document IDs'),
      signerIds: z.array(z.string()).optional().describe('Associated signer IDs'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last update timestamp'),
      context: z.any().optional().describe('Full raw context from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let result = await client.getSignatureRequestContext(ctx.input.signatureRequestId);

    return {
      output: {
        signatureRequestId: result.signatureRequestId || ctx.input.signatureRequestId,
        status: result.status,
        title: result.title,
        description: result.description,
        externalId: result.externalId,
        signatureProfileId: result.signatureProfileId,
        documentIds: result.documentIds,
        signerIds: result.signerIds,
        createdAt: result.createdAt,
        updatedAt: result.updatedAt,
        context: result
      },
      message: `Retrieved signature request **${ctx.input.signatureRequestId}** with status: **${result.status || 'unknown'}**.`
    };
  })
  .build();
