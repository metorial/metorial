import { SlateTool } from 'slates';
import { z } from 'zod';
import { DockClient } from '../lib/client';
import { spec } from '../spec';

export let createProofRequest = SlateTool.create(spec, {
  name: 'Create Proof Request',
  key: 'create_proof_request',
  description: `Create a proof request for verifying credentials held by a wallet holder. Returns a URL for displaying as a QR code that wallet apps can scan.
Uses the DIF Presentation Exchange (PEX) syntax for querying and filtering credentials.`,
  instructions: [
    'Define input_descriptors in the request field to specify which credential attributes are required.',
    'Each input descriptor should have an id, name, purpose, and constraints with field paths.',
    'The returned URL should be displayed as a QR code for the wallet holder to scan.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z
        .string()
        .optional()
        .describe('Name of the proof request visible to both parties'),
      purpose: z.string().optional().describe('Purpose or reason for the proof request'),
      request: z
        .record(z.string(), z.unknown())
        .describe(
          'DIF Presentation Exchange request object with input_descriptors defining required credential fields'
        ),
      nonce: z.string().optional().describe('Nonce/challenge string to prevent replay attacks')
    })
  )
  .output(
    z.object({
      proofRequestId: z.string().optional().describe('ID of the created proof request'),
      qrUrl: z.string().optional().describe('URL to display as a QR code for wallet scanning'),
      proofRequest: z.record(z.string(), z.unknown()).describe('Full proof request document')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DockClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let result = await client.createProofRequest({
      name: ctx.input.name,
      purpose: ctx.input.purpose,
      request: ctx.input.request,
      nonce: ctx.input.nonce
    });

    return {
      output: {
        proofRequestId: result.id as string | undefined,
        qrUrl: result.qr as string | undefined,
        proofRequest: result
      },
      message: `Created proof request${result.id ? ` **${result.id}**` : ''}${ctx.input.name ? ` "${ctx.input.name}"` : ''}`
    };
  })
  .build();
