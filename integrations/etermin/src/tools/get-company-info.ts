import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCompanyInfo = SlateTool.create(spec, {
  name: 'Get Company Info',
  key: 'get_company_info',
  description: `Retrieve company account information associated with the eTermin account. Returns the company profile and account settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      company: z.record(z.string(), z.any()).describe('Company account information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.getCompanyInfo();

    return {
      output: { company: result },
      message: `Retrieved company information.`
    };
  })
  .build();
