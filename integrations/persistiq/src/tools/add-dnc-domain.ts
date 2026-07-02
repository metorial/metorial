import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let addDncDomain = SlateTool.create(spec, {
  name: 'Add Do Not Contact Domain',
  key: 'add_dnc_domain',
  description: `Add a domain to the Do Not Contact (DNC) list. Prevents outreach to any email address at the specified domain. Use this to maintain compliance and exclude companies from campaigns.`
})
  .input(
    z.object({
      domain: z.string().describe('Domain to add to the DNC list (e.g. example.com)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the domain was successfully added'),
      domain: z.string().describe('The domain that was added')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.addDncDomain(ctx.input.domain);

    return {
      output: {
        success: true,
        domain: ctx.input.domain
      },
      message: `Added **${ctx.input.domain}** to the Do Not Contact list.`
    };
  })
  .build();
