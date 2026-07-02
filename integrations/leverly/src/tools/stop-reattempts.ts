import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeverlyClient } from '../lib/client';
import { spec } from '../spec';

export let stopReattempts = SlateTool.create(spec, {
  name: 'Stop Reattempts',
  key: 'stop_reattempts',

  description: `Stop the automated call reattempt sequence for a specific lead by phone number. Use this when a lead has been contacted through other means, is no longer interested, or should not receive further call attempts from Leverly.`,

  instructions: [
    'Provide the exact phone number that was originally submitted to Leverly for the lead.'
  ],

  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      phone: z
        .string()
        .describe(
          'Phone number of the lead to stop reattempts for. Must match the number originally submitted.'
        )
    })
  )
  .output(
    z.object({
      submitted: z
        .boolean()
        .describe('Whether the stop reattempts request was successfully submitted'),
      phone: z.string().describe('Phone number for which reattempts were stopped'),
      response: z.string().optional().describe('Raw response from the Leverly API')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeverlyClient({
      username: ctx.auth.username,
      token: ctx.auth.token,
      accountId: ctx.auth.accountId
    });

    let response = await client.stopReattempts({
      phone: ctx.input.phone
    });

    let responseStr = typeof response === 'string' ? response : JSON.stringify(response);

    return {
      output: {
        submitted: true,
        phone: ctx.input.phone,
        response: responseStr
      },
      message: `Reattempt sequence stopped for lead with phone number **${ctx.input.phone}**. No further automated call attempts will be made to this lead.`
    };
  })
  .build();
