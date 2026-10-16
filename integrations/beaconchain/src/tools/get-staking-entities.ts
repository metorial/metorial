import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconchainClient } from '../lib/client';
import { spec } from '../spec';

export let getStakingEntities = SlateTool.create(spec, {
  name: 'Get Staking Entities',
  key: 'get_staking_entities',
  description: `Retrieve staking entity data including validator counts, BeaconScore performance ratings, and network share. Optionally drill into sub-entities for a specific entity.
This is a **Pro-tier** feature requiring a Scale or Enterprise plan.`,
  constraints: [
    'Requires Scale or Enterprise subscription.',
    'Entity data is updated hourly.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      evaluationWindow: z
        .enum(['24h', '7d', '30d', '90d'])
        .optional()
        .describe('Entity comparison evaluation window. Defaults to 24h.'),
      entity: z
        .string()
        .optional()
        .describe(
          'Entity name to look up sub-entities for. If omitted, returns the full entity overview list.'
        ),
      pageSize: z.number().optional().describe('Number of results per page (1-10)'),
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      entities: z
        .any()
        .describe(
          'Entity or sub-entity list with validator counts, BeaconScore, and share data'
        ),
      paging: z.any().optional().describe('Pagination info if more results are available')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconchainClient({
      token: ctx.auth.token,
      chain: ctx.config.chain
    });

    let pagination = { pageSize: ctx.input.pageSize, cursor: ctx.input.cursor };
    let response: any;

    if (ctx.input.entity) {
      response = await client.getSubEntities(
        ctx.input.entity,
        pagination,
        ctx.input.evaluationWindow
      );
    } else {
      response = await client.getEntities(pagination, ctx.input.evaluationWindow);
    }

    return {
      output: {
        entities: response.data ?? response,
        paging: response.paging
      },
      message: ctx.input.entity
        ? `Retrieved sub-entities for **${ctx.input.entity}** on ${ctx.config.chain}.`
        : `Retrieved staking entities overview on ${ctx.config.chain}.`
    };
  })
  .build();
