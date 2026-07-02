import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let checkCredits = SlateTool.create(spec, {
  name: 'Check Credits',
  key: 'check_credits',
  description: `Check the remaining credit balance on your Wiza account. Returns email credits, phone credits, export credits, and API credits. Credit values can be a number or "unlimited".`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      emailCredits: z
        .union([z.number(), z.string()])
        .describe('Remaining email credits (number or "unlimited").'),
      phoneCredits: z
        .union([z.number(), z.string()])
        .describe('Remaining phone credits (number or "unlimited").'),
      exportCredits: z
        .union([z.number(), z.string()])
        .describe('Remaining export credits (number or "unlimited").'),
      apiCredits: z
        .union([z.number(), z.string()])
        .describe('Remaining API credits (number or "unlimited").')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getCredits();
    let c = result.credits;

    ctx.info({ message: 'Credit balance retrieved', ...c });

    let output = {
      emailCredits: c.email_credits,
      phoneCredits: c.phone_credits,
      exportCredits: c.export_credits,
      apiCredits: c.api_credits
    };

    let parts = ['**Credit Balance:**'];
    parts.push(`- Email credits: **${c.email_credits}**`);
    parts.push(`- Phone credits: **${c.phone_credits}**`);
    parts.push(`- Export credits: **${c.export_credits}**`);
    parts.push(`- API credits: **${c.api_credits}**`);

    return {
      output,
      message: parts.join('\n')
    };
  })
  .build();
