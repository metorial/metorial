import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignOutputSchema = z.object({
  campaignId: z.string().describe('Unique campaign ID'),
  name: z.string().describe('Campaign name'),
  description: z.string().optional().nullable().describe('Campaign description'),
  scheduleSendDate: z.string().optional().nullable().describe('Scheduled send date'),
  status: z.string().optional().nullable().describe('Campaign status'),
  dateCreated: z.string().optional().nullable().describe('Creation date'),
  dateModified: z.string().optional().nullable().describe('Last modification date')
});

let mapCampaign = (data: any) => ({
  campaignId: data.id,
  name: data.name,
  description: data.description ?? null,
  scheduleSendDate: data.schedule_send_date ?? null,
  status: data.status ?? null,
  dateCreated: data.date_created ?? null,
  dateModified: data.date_modified ?? null
});

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new direct mail campaign. Campaigns combine design creatives with audience uploads (CSV recipient lists) to send mail at scale. After creation, attach creatives and upload audiences before sending.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Campaign name'),
      description: z.string().optional().describe('Campaign description'),
      scheduleSendDate: z.string().optional().describe('ISO 8601 date to schedule sending'),
      useType: z.string().optional().describe('Use type (e.g., "marketing" or "operational")')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createCampaign(ctx.input);
    let mapped = mapCampaign(result);
    return {
      output: mapped,
      message: `Created campaign **${mapped.name}** (${mapped.campaignId})`
    };
  });

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve details of a specific campaign including its status and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID (starts with "cmp_")')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getCampaign(ctx.input.campaignId);
    return {
      output: mapCampaign(result),
      message: `Campaign **${result.name}** — status: **${result.status ?? 'unknown'}**`
    };
  });

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `List campaigns with optional pagination.`,
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
        .describe('Number of campaigns to return (max 100, default 10)'),
      offset: z.number().optional().describe('Number of campaigns to skip')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignOutputSchema),
      totalCount: z.number().describe('Total count')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCampaigns({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });
    let campaigns = (result.data || []).map(mapCampaign);
    return {
      output: {
        campaigns,
        totalCount: result.total_count ?? result.count ?? campaigns.length
      },
      message: `Found **${campaigns.length}** campaigns`
    };
  });

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update a campaign's name, description, or scheduled send date.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID to update'),
      name: z.string().optional().describe('New campaign name'),
      description: z.string().optional().describe('New description'),
      scheduleSendDate: z.string().optional().describe('New scheduled send date')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.updateCampaign(ctx.input.campaignId, {
      name: ctx.input.name,
      description: ctx.input.description,
      scheduleSendDate: ctx.input.scheduleSendDate
    });
    return {
      output: mapCampaign(result),
      message: `Updated campaign **${result.name}** (${result.id})`
    };
  });

export let sendCampaign = SlateTool.create(spec, {
  name: 'Send Campaign',
  key: 'send_campaign',
  description: `Send a campaign immediately. The campaign must have creatives and audiences configured before sending.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID to send')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.sendCampaign(ctx.input.campaignId);
    return {
      output: mapCampaign(result),
      message: `Campaign **${result.id}** is now sending`
    };
  });

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Delete a campaign. Only campaigns that have not been sent can be deleted.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('The campaign ID to delete')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('ID of the deleted campaign'),
      deleted: z.boolean().describe('Whether it was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.deleteCampaign(ctx.input.campaignId);
    return {
      output: {
        campaignId: result.id,
        deleted: result.deleted ?? true
      },
      message: `Deleted campaign **${ctx.input.campaignId}**`
    };
  });
