import { SlateTool } from 'slates';
import { z } from 'zod';
import { IdentityCheckClient } from '../lib/client';
import { spec } from '../spec';

export let requestProofOfAddress = SlateTool.create(spec, {
  name: 'Request Proof of Address',
  key: 'request_proof_of_address',
  description: `Sends a proof of address verification request to an individual. The recipient will receive an email with a link to upload their proof of address documentation. This is an add-on check typically used alongside identity verification to confirm an individual's residential address.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      email: z.string().describe('Email address of the individual'),
      firstName: z.string().optional().describe('First name of the individual'),
      lastName: z.string().optional().describe('Last name of the individual'),
      referenceId: z
        .string()
        .optional()
        .describe('Your own reference ID to correlate this check with your records')
    })
  )
  .output(
    z.object({
      checkId: z.string().describe('Unique ID of the proof of address check'),
      status: z.string().describe('Current status of the check'),
      email: z.string().describe('Email address the request was sent to'),
      createdAt: z.string().optional().describe('Timestamp when the check was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IdentityCheckClient(ctx.auth.token);

    let result = await client.createProofOfAddress({
      email: ctx.input.email,
      firstName: ctx.input.firstName,
      lastName: ctx.input.lastName,
      referenceId: ctx.input.referenceId
    });

    return {
      output: {
        checkId: result.id || result.check_id,
        status: result.status || 'pending',
        email: result.email || ctx.input.email,
        createdAt: result.created_at
      },
      message: `Proof of address request sent to **${ctx.input.email}**. Check ID: \`${result.id || result.check_id}\`.`
    };
  })
  .build();
