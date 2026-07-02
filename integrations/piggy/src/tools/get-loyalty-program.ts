import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getLoyaltyProgram = SlateTool.create(spec, {
  name: 'Get Loyalty Program',
  key: 'get_loyalty_program',
  description: `Retrieve the loyalty program configuration including program name, max credit amount, custom credit name, and unit settings. Also lists available tiers and gift card programs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      includeTiers: z.boolean().optional().describe('Also fetch the list of tiers'),
      includeGiftcardPrograms: z
        .boolean()
        .optional()
        .describe('Also fetch the list of gift card programs')
    })
  )
  .output(
    z.object({
      programName: z.string().optional().describe('Loyalty program name'),
      maxAmount: z.number().optional().describe('Maximum credit amount per transaction'),
      customCreditName: z.string().optional().describe('Custom name for credits'),
      unitName: z.string().optional().describe('Default unit name'),
      unitLabel: z.string().optional().describe('Default unit label'),
      tiers: z
        .array(
          z
            .object({
              tierUuid: z.string().optional().describe('UUID of the tier'),
              name: z.string().optional().describe('Tier name'),
              description: z.string().optional().describe('Tier description'),
              position: z.number().optional().describe('Tier position/rank')
            })
            .passthrough()
        )
        .optional()
        .describe('List of tiers'),
      giftcardPrograms: z
        .array(
          z
            .object({
              programUuid: z.string().optional().describe('UUID of the gift card program'),
              name: z.string().optional().describe('Program name'),
              active: z.boolean().optional().describe('Whether the program is active'),
              maxAmountInCents: z.number().optional().describe('Max amount in cents'),
              minAmountInCents: z.number().optional().describe('Min amount in cents')
            })
            .passthrough()
        )
        .optional()
        .describe('List of gift card programs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.getLoyaltyProgram();
    let program = result.data || result;

    let output: any = {
      programName: program.name,
      maxAmount: program.max_amount,
      customCreditName: program.custom_credit_name,
      unitName: program.unit?.name,
      unitLabel: program.unit?.label
    };

    if (ctx.input.includeTiers) {
      try {
        let tiersResult = await client.listTiers();
        output.tiers = (tiersResult.data || []).map((t: any) => ({
          tierUuid: t.uuid,
          name: t.name,
          description: t.description,
          position: t.position,
          ...t
        }));
      } catch {
        output.tiers = [];
      }
    }

    if (ctx.input.includeGiftcardPrograms) {
      try {
        let programsResult = await client.listGiftcardPrograms();
        output.giftcardPrograms = (programsResult.data || []).map((p: any) => ({
          programUuid: p.uuid,
          name: p.name,
          active: p.active,
          maxAmountInCents: p.max_amount_in_cents,
          minAmountInCents: p.min_amount_in_cents,
          ...p
        }));
      } catch {
        output.giftcardPrograms = [];
      }
    }

    return {
      output,
      message: `Loyalty program: **${program.name || 'unnamed'}**${output.tiers ? `, ${output.tiers.length} tier(s)` : ''}${output.giftcardPrograms ? `, ${output.giftcardPrograms.length} gift card program(s)` : ''}.`
    };
  })
  .build();
