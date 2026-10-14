import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description:
    'Retrieve the Benchmark Email Classic account connected by the current API token, including its client ID, contact email, name, and account status.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      clientId: z.string().describe('Connected account client ID'),
      email: z.string().describe('Account contact email'),
      firstName: z.string().describe('Account first name'),
      lastName: z.string().describe('Account last name'),
      login: z.string().describe('Account login'),
      company: z.string().describe('Company name'),
      status: z.string().describe('Account status'),
      planName: z.string().describe('Account plan name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let output = await client.getProfile();
    return {
      output,
      message: `Connected to Benchmark Email Classic account ${output.clientId}${output.email ? ` (${output.email})` : ''}.`
    };
  })
  .build();
