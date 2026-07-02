import { SlateTool } from 'slates';
import { z } from 'zod';
import { FreeAgentClient } from '../lib/client';
import { spec } from '../spec';

export let getCompany = SlateTool.create(spec, {
  name: 'Get Company',
  key: 'get_company',
  description: `Retrieve company information from FreeAgent including name, type, currency, start dates, and tax settings.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      company: z.record(z.string(), z.any()).describe('Company information')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FreeAgentClient({
      token: ctx.auth.token,
      environment: ctx.config.environment
    });

    let company = await client.getCompany();

    return {
      output: { company },
      message: `Retrieved company: **${company.name}** (${company.type})`
    };
  })
  .build();
