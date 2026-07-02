import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getSyncCommittee = SlateTool.create(spec, {
  name: 'Get Sync Committee',
  key: 'get_sync_committee',
  description: `Retrieve sync committee information for a given period, including committee overview and optionally the list of assigned validators with their performance.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      period: z.number().describe('Sync committee period number'),
      includeValidators: z
        .boolean()
        .optional()
        .describe('Include the list of validators assigned to this sync committee period'),
      pageSize: z.number().optional().describe('Number of validator results per page (1-100)'),
      cursor: z.string().optional().describe('Pagination cursor for validator list')
    })
  )
  .output(
    z.object({
      syncCommitteeOverview: z.any().describe('Sync committee overview for the period'),
      validators: z
        .any()
        .optional()
        .describe('Validators assigned to this sync committee period'),
      paging: z.any().optional().describe('Pagination info for validators list')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let syncCommitteeOverview = await client.getSyncCommitteeOverview(ctx.input.period);
    let result: Record<string, any> = { syncCommitteeOverview };

    if (ctx.input.includeValidators) {
      let validatorResponse = await client.getSyncCommitteeValidators(ctx.input.period, {
        pageSize: ctx.input.pageSize,
        cursor: ctx.input.cursor
      });
      result.validators = validatorResponse.data ?? validatorResponse;
      result.paging = validatorResponse.paging;
    }

    return {
      output: result as any,
      message: `Retrieved sync committee info for period **${ctx.input.period}** on ${ctx.config.chain}.`
    };
  })
  .build();
