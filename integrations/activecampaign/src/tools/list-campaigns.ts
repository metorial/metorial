import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Lists email campaigns with optional pagination. Returns campaign names, types, send dates, and status information.`,
  tags: {
    destructive: false,
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
      orderByDateDesc: z.boolean().optional().describe('Sort by send date descending')
    })
  )
  .output(
    z.object({
      campaigns: z.array(
        z.object({
          campaignId: z.string(),
          name: z.string().optional(),
          type: z.string().optional(),
          status: z.string().optional(),
          sendDate: z.string().optional(),
          totalSent: z.number().optional(),
          opens: z.number().optional(),
          clicks: z.number().optional()
        })
      ),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    let params: Record<string, any> = {};
    if (ctx.input.limit) params.limit = ctx.input.limit;
    if (ctx.input.offset) params.offset = ctx.input.offset;
    if (ctx.input.orderByDateDesc) params['orders[sdate]'] = 'DESC';

    let result = await client.listCampaigns(params);

    let campaigns = (result.campaigns || []).map((c: any) => ({
      campaignId: c.id,
      name: c.name || undefined,
      type: c.type || undefined,
      status: c.status !== undefined ? String(c.status) : undefined,
      sendDate: c.sdate || undefined,
      totalSent: c.send_amt ? Number(c.send_amt) : undefined,
      opens: c.uniqueopens ? Number(c.uniqueopens) : undefined,
      clicks: c.uniquelinkclicks ? Number(c.uniquelinkclicks) : undefined
    }));

    let totalCount = result.meta?.total ? Number(result.meta.total) : undefined;

    return {
      output: { campaigns, totalCount },
      message: `Found **${campaigns.length}** campaigns${totalCount !== undefined ? ` (out of ${totalCount} total)` : ''}.`
    };
  })
  .build();
