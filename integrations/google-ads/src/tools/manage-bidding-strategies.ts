import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { googleAdsActionScopes } from '../scopes';
import { spec } from '../spec';

export let manageBiddingStrategies = SlateTool.create(spec, {
  name: 'Manage Bidding Strategies',
  key: 'manage_bidding_strategies',
  description: `Create, update, or remove portfolio bidding strategies that can be shared across multiple campaigns. Portfolio strategies centralize bid management and enable cross-campaign optimization.

For campaign-level bidding, use the Manage Campaigns tool instead. This tool is specifically for shared/portfolio bidding strategies.`,
  instructions: [
    'Provide exactly one strategy configuration (targetCpa, targetRoas, maximizeConversions, maximizeConversionValue, or targetSpend).',
    'Monetary values use micros (1 currency unit = 1,000,000 micros).'
  ]
})
  .scopes(googleAdsActionScopes.manageBiddingStrategies)
  .input(
    z.object({
      customerId: z.string().describe('The Google Ads customer account ID'),
      operation: z.enum(['create', 'update', 'remove']).describe('The operation to perform'),
      biddingStrategyId: z
        .string()
        .optional()
        .describe('Bidding strategy ID (required for update/remove)'),
      name: z.string().optional().describe('Name for the bidding strategy'),
      targetCpa: z
        .object({
          targetCpaMicros: z.string().optional().describe('Target CPA in micros')
        })
        .optional()
        .describe('Target CPA strategy configuration'),
      targetRoas: z
        .object({
          targetRoas: z.number().optional().describe('Target ROAS value (e.g., 3.5 for 350%)')
        })
        .optional()
        .describe('Target ROAS strategy configuration'),
      maximizeConversions: z
        .object({
          targetCpaMicros: z.string().optional().describe('Optional target CPA limit')
        })
        .optional()
        .describe('Maximize Conversions strategy configuration'),
      maximizeConversionValue: z
        .object({
          targetRoas: z.number().optional().describe('Optional target ROAS limit')
        })
        .optional()
        .describe('Maximize Conversion Value strategy configuration'),
      targetSpend: z
        .object({
          cpcBidCeilingMicros: z
            .string()
            .optional()
            .describe('Maximum CPC bid limit in micros')
        })
        .optional()
        .describe('Target Spend strategy configuration')
    })
  )
  .output(
    z.object({
      biddingStrategyResourceName: z
        .string()
        .optional()
        .describe('Resource name of the bidding strategy'),
      mutateResults: z.any().optional().describe('Raw API response')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { customerId, operation } = ctx.input;
    let cid = customerId.replace(/-/g, '');

    if (operation === 'remove') {
      if (!ctx.input.biddingStrategyId) throw new Error('biddingStrategyId required');
      let result = await client.mutateBiddingStrategies(cid, [
        {
          remove: `customers/${cid}/biddingStrategies/${ctx.input.biddingStrategyId}`
        }
      ]);
      return {
        output: { mutateResults: result },
        message: `Bidding strategy **${ctx.input.biddingStrategyId}** removed.`
      };
    }

    if (operation === 'create') {
      let strategyData: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.targetCpa) strategyData.targetCpa = ctx.input.targetCpa;
      if (ctx.input.targetRoas) strategyData.targetRoas = ctx.input.targetRoas;
      if (ctx.input.maximizeConversions)
        strategyData.maximizeConversions = ctx.input.maximizeConversions;
      if (ctx.input.maximizeConversionValue)
        strategyData.maximizeConversionValue = ctx.input.maximizeConversionValue;
      if (ctx.input.targetSpend) strategyData.targetSpend = ctx.input.targetSpend;

      let result = await client.mutateBiddingStrategies(cid, [{ create: strategyData }]);
      return {
        output: {
          biddingStrategyResourceName: result.results?.[0]?.resourceName,
          mutateResults: result
        },
        message: `Bidding strategy **${ctx.input.name}** created.`
      };
    }

    // Update
    if (!ctx.input.biddingStrategyId) throw new Error('biddingStrategyId required');
    let resourceName = `customers/${cid}/biddingStrategies/${ctx.input.biddingStrategyId}`;
    let updateData: Record<string, any> = { resourceName };
    let maskFields: string[] = [];

    if (ctx.input.name !== undefined) {
      updateData.name = ctx.input.name;
      maskFields.push('name');
    }
    if (ctx.input.targetCpa) {
      updateData.targetCpa = ctx.input.targetCpa;
      maskFields.push('targetCpa');
    }
    if (ctx.input.targetRoas) {
      updateData.targetRoas = ctx.input.targetRoas;
      maskFields.push('targetRoas');
    }
    if (ctx.input.maximizeConversions) {
      updateData.maximizeConversions = ctx.input.maximizeConversions;
      maskFields.push('maximizeConversions');
    }
    if (ctx.input.maximizeConversionValue) {
      updateData.maximizeConversionValue = ctx.input.maximizeConversionValue;
      maskFields.push('maximizeConversionValue');
    }
    if (ctx.input.targetSpend) {
      updateData.targetSpend = ctx.input.targetSpend;
      maskFields.push('targetSpend');
    }

    let result = await client.mutateBiddingStrategies(cid, [
      {
        update: updateData,
        updateMask: maskFields.join(',')
      }
    ]);

    return {
      output: { biddingStrategyResourceName: resourceName, mutateResults: result },
      message: `Bidding strategy **${ctx.input.biddingStrategyId}** updated.`
    };
  })
  .build();
