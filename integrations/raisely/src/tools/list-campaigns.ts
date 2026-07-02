import { SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List fundraising campaigns in your Raisely organization. Returns campaigns in descending order of creation by default. Use to browse available campaigns or find a specific campaign UUID for use with other tools.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z
        .number()
        .optional()
        .describe('Maximum number of campaigns to return (default 20)'),
      offset: z.number().optional().describe('Number of campaigns to skip for pagination'),
      sort: z.string().optional().describe('Field to sort by, e.g. "createdAt", "name"'),
      order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
      includePrivateData: z.boolean().optional().describe('Include private/custom field data')
    })
  )
  .output(
    z.object({
      campaigns: z.array(z.record(z.string(), z.any())).describe('List of campaign objects'),
      pagination: z
        .object({
          total: z.number().optional(),
          offset: z.number().optional(),
          limit: z.number().optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });

    let result = await client.listCampaigns({
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      sort: ctx.input.sort,
      order: ctx.input.order,
      private: ctx.input.includePrivateData
    });

    let campaigns = result.data || [];
    let pagination = result.pagination;

    return {
      output: { campaigns, pagination },
      message: `Found **${campaigns.length}** campaign(s).`
    };
  })
  .build();
