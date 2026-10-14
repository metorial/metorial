import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description:
    'Finds a SuiteDash CRM company by UID or exact name. Returns the provider response with its primary contact and company custom fields.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      identifier: z
        .string()
        .min(1)
        .describe('Company UID from List Companies, or its exact name')
    })
  )
  .output(
    z.object({
      company: z
        .record(z.string(), z.unknown())
        .describe('Provider response containing the company in its data field')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let company = await client.getCompany(ctx.input.identifier);
    return {
      output: { company },
      message: `Retrieved company **${ctx.input.identifier}**.`
    };
  })
  .build();
