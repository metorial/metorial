import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendloopClient } from '../lib/client';
import { spec } from '../spec';

export let getCampaigns = SlateTool.create(spec, {
  name: 'Get Campaigns',
  key: 'get_campaigns',
  description: `Retrieve email campaigns with optional status filters, or fetch a specific campaign by ID. Use status filters to narrow down results to only drafts, sending, sent, etc.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z
        .string()
        .optional()
        .describe(
          'Specific campaign ID to retrieve. If omitted, returns a filtered list of campaigns.'
        ),
      ignoreDrafts: z.boolean().optional().describe('Exclude draft campaigns from results'),
      ignoreSending: z.boolean().optional().describe('Exclude currently sending campaigns'),
      ignorePaused: z.boolean().optional().describe('Exclude paused campaigns'),
      ignoreSent: z.boolean().optional().describe('Exclude already sent campaigns'),
      ignoreFailed: z.boolean().optional().describe('Exclude failed campaigns'),
      ignoreApproval: z.boolean().optional().describe('Exclude campaigns pending approval')
    })
  )
  .output(
    z.object({
      campaigns: z.array(z.record(z.string(), z.any())).describe('Array of campaign objects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendloopClient({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain
    });

    if (ctx.input.campaignId) {
      let result = await client.getCampaign(ctx.input.campaignId);
      let campaign = result.Campaign || result;
      return {
        output: { campaigns: [campaign] },
        message: `Retrieved details for campaign **${ctx.input.campaignId}**.`
      };
    }

    let result = await client.getCampaigns({
      ignoreDrafts: ctx.input.ignoreDrafts,
      ignoreSending: ctx.input.ignoreSending,
      ignorePaused: ctx.input.ignorePaused,
      ignoreSent: ctx.input.ignoreSent,
      ignoreFailed: ctx.input.ignoreFailed,
      ignoreApproval: ctx.input.ignoreApproval
    });

    let campaigns = result.Campaigns || result.Data || [];
    if (!Array.isArray(campaigns)) campaigns = [campaigns];

    return {
      output: { campaigns },
      message: `Retrieved **${campaigns.length}** campaign(s).`
    };
  })
  .build();
