import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

let validatorSelectorSchema = z.object({
  validatorIdentifiers: z
    .array(z.union([z.string(), z.number()]))
    .optional()
    .describe('Array of validator indices or public keys'),
  dashboardId: z.number().optional().describe('Dashboard ID to select validators from')
});

export let getValidatorRewards = SlateTool.create(spec, {
  name: 'Get Validator Rewards',
  key: 'get_validator_rewards',
  description: `Retrieve detailed staking reward breakdowns for Ethereum validators. Returns per-validator, per-epoch rewards including attestation rewards (head, source, target), sync committee rewards, block proposal rewards (execution and consensus layer), and penalties.
Use the aggregate mode for cumulative totals or the list mode for epoch-by-epoch detail.`,
  instructions: [
    'Use "aggregate" mode for a summary of cumulative rewards across all epochs.',
    'Use "list" mode for a per-epoch breakdown. Optionally filter by a specific epoch.',
    'Pagination is available in list mode via cursor and pageSize.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      validators: validatorSelectorSchema,
      mode: z
        .enum(['list', 'aggregate'])
        .default('list')
        .describe('Whether to return per-epoch list or cumulative aggregate'),
      epoch: z
        .number()
        .optional()
        .describe('Specific epoch to filter rewards for (list mode only)'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (1-100, default 10)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      rewards: z
        .any()
        .describe('Reward data, either a list of per-epoch entries or an aggregate summary'),
      paging: z
        .any()
        .optional()
        .describe('Pagination info with next_cursor if more results are available'),
      range: z.any().optional().describe('Epoch and slot range covered by the response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let selector = {
      validatorIdentifiers: ctx.input.validators.validatorIdentifiers,
      dashboardId: ctx.input.validators.dashboardId
    };

    let result: Record<string, any>;

    if (ctx.input.mode === 'aggregate') {
      let response = await client.getValidatorRewardsAggregate(selector);
      result = { rewards: response };
    } else {
      let response = await client.getValidatorRewardsList(selector, ctx.input.epoch, {
        pageSize: ctx.input.pageSize,
        cursor: ctx.input.cursor
      });
      result = {
        rewards: response.data ?? response,
        paging: response.paging,
        range: response.range
      };
    }

    return {
      output: result as any,
      message: `Retrieved ${ctx.input.mode} rewards for validators on ${ctx.config.chain}.`
    };
  })
  .build();
