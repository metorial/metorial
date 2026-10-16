import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getValidatorQueues = SlateTool.create(spec, {
  key: 'get_validator_queues',
  name: 'Get Validator Queues',
  description:
    'Retrieve staking queue positions and estimated processing times for selected validators, including deposits, exits, full withdrawals, consolidations, and compounding switches.',
  instructions: [
    'Provide exactly one of validatorIdentifiers or dashboardId. Queue estimates describe the selected validators; network queue estimates are available through get_network_state.'
  ],
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      validators: z.object({
        validatorIdentifiers: z
          .array(z.union([z.string(), z.number()]))
          .optional()
          .describe('Validator indices or 0x-prefixed public keys'),
        dashboardId: z.number().optional().describe('Dashboard ID visible in its URL'),
        groupId: z.number().optional().describe('Optional group within dashboardId')
      }),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(10)
        .optional()
        .describe('Results per page; defaults to 10'),
      cursor: z.string().optional().describe('paging.next_cursor from the preceding response')
    })
  )
  .output(
    z.object({
      queues: z.any().describe('Complete queue response, including data and paging')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({ token: ctx.auth.token, chain: ctx.config.chain });
    let queues = await client.getValidatorStakingQueues(ctx.input.validators, {
      pageSize: ctx.input.pageSize,
      cursor: ctx.input.cursor
    });
    return {
      output: { queues },
      message: `Retrieved validator queue estimates on ${ctx.config.chain}.`
    };
  })
  .build();
