import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCredits = SlateTool.create(spec, {
  name: 'Get Credits',
  key: 'get_credits',
  description: `Check your OpenRouter account credits balance and total usage. Credits are deposits used for LLM inference — request costs are deducted from your balance.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      totalCredits: z.number().describe('Total credits deposited to the account'),
      totalUsage: z.number().describe('Total credits consumed by API usage'),
      remainingCredits: z.number().describe('Remaining usable credits')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      siteUrl: ctx.config.siteUrl,
      appTitle: ctx.config.appTitle
    });

    let data = await client.getCredits();

    let remaining = data.totalCredits - data.totalUsage;

    return {
      output: {
        totalCredits: data.totalCredits,
        totalUsage: data.totalUsage,
        remainingCredits: remaining
      },
      message: `Credits: **$${remaining.toFixed(4)}** remaining (deposited: $${data.totalCredits.toFixed(4)}, used: $${data.totalUsage.toFixed(4)}).`
    };
  })
  .build();
