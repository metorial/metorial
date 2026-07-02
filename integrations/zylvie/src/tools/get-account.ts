import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getAccount = SlateTool.create(spec, {
  name: 'Get Account Info',
  key: 'get_account',
  description: `Retrieve account information for the authenticated Zylvie user, including email and brand name.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      email: z.string().describe('Account email address'),
      brand: z.string().describe('Brand/business name')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getMe();

    return {
      output: {
        email: result.email,
        brand: result.brand
      },
      message: `Account: **${result.brand}** (${result.email}).`
    };
  })
  .build();
