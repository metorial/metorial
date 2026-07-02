import { SlateTool } from 'slates';
import { z } from 'zod';
import { IgnisignClient } from '../lib/client';
import { spec } from '../spec';

export let getSigner = SlateTool.create(spec, {
  name: 'Get Signer',
  key: 'get_signer',
  description: `Retrieve details of a specific signer including their profile, claims, and status.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      signerId: z.string().describe('ID of the signer to retrieve'),
      detailed: z
        .boolean()
        .optional()
        .describe(
          'If true, fetch full details including claims context; otherwise returns summary'
        )
    })
  )
  .output(
    z.object({
      signerId: z.string().describe('Signer ID'),
      status: z.string().optional().describe('Current signer status'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Email address'),
      signerProfileId: z.string().optional().describe('Associated signer profile ID'),
      context: z.any().optional().describe('Full signer context from the API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new IgnisignClient({
      token: ctx.auth.token,
      appId: ctx.config.appId,
      appEnv: ctx.config.appEnv
    });

    let result = ctx.input.detailed
      ? await client.getSignerDetails(ctx.input.signerId)
      : await client.getSigner(ctx.input.signerId);

    return {
      output: {
        signerId: result.signerId || ctx.input.signerId,
        status: result.status,
        firstName: result.firstName,
        lastName: result.lastName,
        email: result.email,
        signerProfileId: result.signerProfileId,
        context: result
      },
      message: `Retrieved signer **${ctx.input.signerId}**${result.status ? ` (status: ${result.status})` : ''}.`
    };
  })
  .build();
