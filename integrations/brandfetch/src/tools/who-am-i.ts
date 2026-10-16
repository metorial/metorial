import { SlateTool } from 'slates';
import { z } from 'zod';
import { BrandApiClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Get Authenticated Identity',
  key: 'who_am_i',
  description:
    'Verify the connected Brandfetch credential and retrieve its identity, organization, and current API credit usage. This endpoint does not consume API credits.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      credentialType: z.enum(['api-key', 'user']).describe('Kind of authenticated credential'),
      id: z.string().describe('Authenticated API key or user ID'),
      urn: z.string().describe('Authenticated API key or user URN'),
      name: z.string().nullable().describe('Credential display name, when available'),
      createdAt: z.string().nullable().describe('Provider creation timestamp, when available'),
      email: z
        .string()
        .nullable()
        .optional()
        .describe('User email when authenticated with a user session'),
      usage: z
        .object({
          used: z.number().describe('API credits used this billing period'),
          quota: z.number().describe('API credit allowance this billing period')
        })
        .optional()
        .describe('API key credit usage'),
      organization: z
        .object({
          id: z.string().describe('Connected organization ID'),
          urn: z.string().describe('Connected organization URN'),
          name: z.string().nullable().describe('Connected organization display name')
        })
        .optional(),
      raw: z.unknown().optional().describe('Complete original authenticated viewer response')
    })
  )
  .handleInvocation(async ctx => {
    let viewer = await new BrandApiClient(ctx.auth.token).getViewer();
    return {
      output: {
        credentialType: viewer.type,
        id: viewer.id,
        urn: viewer.urn,
        name: viewer.name,
        createdAt: viewer.createdAt,
        email: viewer.email,
        usage: viewer.usage,
        organization: viewer.organization,
        raw: viewer
      },
      message: `Verified Brandfetch ${viewer.type} **${viewer.name ?? viewer.id}**.`
    };
  })
  .build();
