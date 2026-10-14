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
  scheduleType: z.string().optional().nullable().describe('Campaign scheduling type'),
  isDraft: z.boolean().optional().nullable().describe('Whether the campaign is still a draft'),
  useType: z.string().optional().nullable().describe('Mail use type'),
  dateCreated: z.string().optional().nullable().describe('Creation date'),
  dateModified: z.string().optional().nullable().describe('Last modification date')
});

let mapCampaign = (data: any) => ({
  campaignId: data.id,
  name: data.name,
  description: data.description ?? null,
  scheduleSendDate: data.send_date ?? data.schedule_send_date ?? null,
  status: data.status ?? null,
  scheduleType: data.schedule_type ?? null,
  isDraft: data.is_draft ?? null,
  useType: data.use_type ?? null,
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
      scheduleSendDate: z
        .string()
        .optional()
        .describe(
          'Legacy field. Omit it: the documented campaign API supports immediate scheduling only.'
        ),
      useType: z
        .string()
        .optional()
        .describe(
          'marketing or operational. If omitted, the account must have a default mail use type configured.'
        )
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
      offset: z.number().optional().describe('Number of campaigns to skip'),
      before: z
        .string()
        .optional()
        .describe('Previous-page cursor from previousUrl; cannot be combined with after'),
      after: z
        .string()
        .optional()
        .describe('Next-page cursor from nextUrl; cannot be combined with before')
    })
  )
  .output(
    z.object({
      campaigns: z.array(campaignOutputSchema),
      totalCount: z.number().describe('Total count'),
      nextUrl: z
        .string()
        .optional()
        .nullable()
        .describe('Next-page URL; pass its after query value to after'),
      previousUrl: z
        .string()
        .optional()
        .nullable()
        .describe('Previous-page URL; pass its before query value to before')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listCampaigns({
      limit: ctx.input.limit,
      before: ctx.input.before,
      after: ctx.input.after,
      offset: ctx.input.offset
    });
    let campaigns = (result.data || []).map(mapCampaign);
    return {
      output: {
        campaigns,
        totalCount: result.total_count ?? result.count ?? campaigns.length,
        nextUrl: result.next_url ?? null,
        previousUrl: result.previous_url ?? null
      },
      message: `Found **${campaigns.length}** campaigns`
    };
  });

export let updateCampaign = SlateTool.create(spec, {
  name: 'Update Campaign',
  key: 'update_campaign',
  description: `Update a campaign's name or description. Date scheduling is not supported by the documented campaign API.`,
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
      scheduleSendDate: z
        .string()
        .optional()
        .describe(
          'Legacy field. Omit it: the documented campaign API supports immediate scheduling only.'
        )
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
  description: `Send a campaign using its configured schedule. The campaign must have creatives and audiences configured before sending.`,
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
      message: `Submitted campaign **${result.id}** for sending`
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
        deleted: result.deleted === true
      },
      message:
        result.deleted === true
          ? `Deleted campaign **${ctx.input.campaignId}**`
          : 'Lob did not confirm the deletion or cancellation. Retrieve the resource to check its state.'
    };
  });
