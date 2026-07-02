import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeeminderClient } from '../lib/client';
import { chargeSchema } from '../lib/schemas';
import { spec } from '../spec';

export let createCharge = SlateTool.create(spec, {
  name: 'Create Charge',
  key: 'create_charge',
  description: `Create a monetary charge against a Beeminder user. Useful for custom penalties or application-specific fees. Supports a dry run mode for testing without actually charging.`,
  constraints: [
    'Minimum charge amount is $1.00 USD.',
    'Charges are real financial transactions (unless dryrun is true).'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      amount: z.number().min(1).describe('Charge amount in USD (minimum $1.00)'),
      note: z.string().optional().describe('Note to attach to the charge'),
      dryrun: z
        .boolean()
        .optional()
        .describe('If true, simulates the charge without actually creating it')
    })
  )
  .output(chargeSchema)
  .handleInvocation(async ctx => {
    let client = new BeeminderClient({
      token: ctx.auth.token,
      username: ctx.auth.username
    });

    let raw = await client.createCharge({
      userId: ctx.auth.username,
      amount: ctx.input.amount,
      note: ctx.input.note,
      dryrun: ctx.input.dryrun
    });

    return {
      output: {
        chargeId: raw.id,
        amount: raw.amount,
        note: raw.note,
        userId: raw.user_id || ctx.auth.username
      },
      message: ctx.input.dryrun
        ? `Dry run: would charge **$${ctx.input.amount}** to user **${ctx.auth.username}**.`
        : `Charged **$${ctx.input.amount}** to user **${ctx.auth.username}**.`
    };
  })
  .build();
