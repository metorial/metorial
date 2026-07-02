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

export let getValidatorPerformance = SlateTool.create(spec, {
  name: 'Get Validator Performance',
  key: 'get_validator_performance',
  description: `Retrieve performance metrics for Ethereum validators including attestation efficiency, BeaconScore, and overall performance ratings.
Use aggregate mode for a summary across validators, or list mode for per-validator performance at a specific epoch.`,
  instructions: [
    'Use "aggregate" mode for overall performance summary and BeaconScore.',
    'Use "list" mode for per-validator details at a specific epoch.'
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
        .enum(['aggregate', 'list'])
        .default('aggregate')
        .describe('Whether to return aggregated or per-validator performance'),
      epoch: z
        .number()
        .optional()
        .describe('Specific epoch (list mode only). Defaults to latest finalized.'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (list mode only, 1-100)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      performance: z
        .any()
        .describe('Performance data: aggregate summary or per-validator list'),
      paging: z.any().optional().describe('Pagination info if in list mode')
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
      let response = await client.getValidatorPerformanceAggregate(selector);
      result = { performance: response };
    } else {
      let response = await client.getValidatorPerformanceList(selector, ctx.input.epoch, {
        pageSize: ctx.input.pageSize,
        cursor: ctx.input.cursor
      });
      result = {
        performance: response.data ?? response,
        paging: response.paging
      };
    }

    return {
      output: result as any,
      message: `Retrieved ${ctx.input.mode} performance for validators on ${ctx.config.chain}.`
    };
  })
  .build();
