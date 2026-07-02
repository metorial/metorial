import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let awardCredits = SlateTool.create(spec, {
  name: 'Award Credits',
  key: 'award_credits',
  description: `Award loyalty credits to a contact. Credits can be awarded directly by specifying a credit amount, or calculated from a unit value (e.g. purchase amount). Use this to reward customers for purchases or other activities.`,
  instructions: [
    'Provide either "credits" for a direct credit amount, or "unitValue" to calculate credits based on the loyalty program rules.',
    'A shopUuid is always required. Use the config default or provide one explicitly.'
  ]
})
  .input(
    z.object({
      contactUuid: z.string().describe('UUID of the contact to award credits to'),
      shopUuid: z
        .string()
        .optional()
        .describe('UUID of the shop (uses config default if not provided)'),
      credits: z.number().optional().describe('Direct number of credits to award'),
      unitValue: z
        .number()
        .optional()
        .describe('Unit value (e.g. purchase amount) to calculate credits from'),
      unitName: z
        .string()
        .optional()
        .describe('Name of the unit (defaults to "purchase_amount")')
    })
  )
  .output(
    z.object({
      creditReceptionUuid: z.string().describe('UUID of the credit reception'),
      credits: z.number().describe('Number of credits awarded'),
      contactUuid: z.string().describe('UUID of the contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let shopUuid = ctx.input.shopUuid || ctx.config.shopUuid;
    if (!shopUuid) throw new Error('shopUuid is required either in input or config');

    let result = await client.createCreditReception({
      shopUuid,
      contactUuid: ctx.input.contactUuid,
      credits: ctx.input.credits,
      unitValue: ctx.input.unitValue,
      unitName: ctx.input.unitName
    });

    let reception = result.data || result;

    return {
      output: {
        creditReceptionUuid: reception.uuid,
        credits: reception.credits,
        contactUuid: ctx.input.contactUuid
      },
      message: `Awarded **${reception.credits}** credits to contact ${ctx.input.contactUuid}.`
    };
  })
  .build();
