import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let campaignOutputSchema = z.object({
  campaignId: z.string().describe('Campaign ID'),
  name: z.string().optional().describe('Campaign name'),
  templateId: z.string().optional().describe('Associated template ID'),
  status: z.string().optional().describe('Campaign status'),
  type: z.string().optional().describe('Campaign type (e.g. postcard, letter)'),
  created: z.string().optional().describe('Creation timestamp'),
  updated: z.string().optional().describe('Last update timestamp'),
  sendDate: z.string().optional().describe('Scheduled send date'),
  dispatched: z.string().optional().describe('Dispatch timestamp'),
  cost: z.string().optional().describe('Total campaign cost')
});

let mapCampaign = (c: any) => ({
  campaignId: String(c.id),
  name: c.name,
  templateId: c.template_id != null ? String(c.template_id) : undefined,
  status: c.status,
  type: c.type,
  created: c.created,
  updated: c.updated,
  sendDate: c.send_date,
  dispatched: c.dispatched,
  cost: c.cost
});

// ---- List Campaigns ----

export let listCampaigns = SlateTool.create(spec, {
  name: 'List Campaigns',
  key: 'list_campaigns',
  description: `Retrieve all campaigns on the account with their current status and details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      campaigns: z.array(campaignOutputSchema).describe('List of campaigns')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.listCampaigns();
    let campaigns = Array.isArray(result) ? result.map(mapCampaign) : [];

    return {
      output: { campaigns },
      message: `Found **${campaigns.length}** campaigns.`
    };
  })
  .build();

// ---- Get Campaign ----

export let getCampaign = SlateTool.create(spec, {
  name: 'Get Campaign',
  key: 'get_campaign',
  description: `Retrieve detailed information about a specific campaign including its status, cost, and send date.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID to look up')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.getCampaign(ctx.input.campaignId);

    return {
      output: mapCampaign(result),
      message: `Campaign **"${result.name}"** (ID: ${result.id}) — Status: ${result.status}.`
    };
  })
  .build();

// ---- Create Campaign ----

export let createCampaign = SlateTool.create(spec, {
  name: 'Create Campaign',
  key: 'create_campaign',
  description: `Create a new bulk mail campaign that targets a recipient group with a design template. After creation, the campaign needs to be approved and booked before it is dispatched.`,
  instructions: [
    'After creating a campaign, use Approve Campaign and then Book Campaign to schedule dispatch.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Campaign name'),
      type: z.enum(['postcard', 'letter', 'greetingcard']).describe('Type of mail to send'),
      groupId: z.number().describe('Recipient group ID to target'),
      templateId: z.number().optional().describe('Template ID for the campaign design'),
      file: z.string().optional().describe('File URL or base64 content for the campaign'),
      front: z.string().optional().describe('Front image URL (for postcards)'),
      back: z.string().optional().describe('Back image URL (for postcards)'),
      size: z.string().optional().describe('Mail size (e.g. 4x6, 6x9, A5)'),
      addons: z.string().optional().describe('Addon codes (e.g. FIRST_CLASS)')
    })
  )
  .output(campaignOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.createCampaign(ctx.input);

    return {
      output: mapCampaign(result),
      message: `Campaign **"${ctx.input.name}"** created with ID **${result.id}**.`
    };
  })
  .build();

// ---- Approve Campaign ----

export let approveCampaign = SlateTool.create(spec, {
  name: 'Approve Campaign',
  key: 'approve_campaign',
  description: `Approve a campaign, locking its design and recipient list. This must be done before booking the campaign for dispatch.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID to approve')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether approval was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    await client.approveCampaign(ctx.input.campaignId);

    return {
      output: { success: true },
      message: `Campaign **${ctx.input.campaignId}** approved and locked.`
    };
  })
  .build();

// ---- Book Campaign ----

export let bookCampaign = SlateTool.create(spec, {
  name: 'Book Campaign',
  key: 'book_campaign',
  description: `Schedule an approved campaign for dispatch on a specific date. The campaign must be approved first.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID to book'),
      sendDate: z.string().describe('Dispatch date in YYYY-MM-DD format'),
      nextAvailableDate: z
        .boolean()
        .optional()
        .describe('Use next available date if requested date is unavailable'),
      useBalance: z.boolean().optional().describe('Use account balance for payment')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether booking was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    await client.bookCampaign(ctx.input.campaignId, ctx.input.sendDate, {
      nextAvailableDate: ctx.input.nextAvailableDate,
      useBalance: ctx.input.useBalance
    });

    return {
      output: { success: true },
      message: `Campaign **${ctx.input.campaignId}** booked for dispatch on **${ctx.input.sendDate}**.`
    };
  })
  .build();

// ---- Get Campaign Cost ----

export let getCampaignCost = SlateTool.create(spec, {
  name: 'Get Campaign Cost',
  key: 'get_campaign_cost',
  description: `Calculate the cost breakdown for a campaign including per-item rates, recipient counts, and totals.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID to calculate cost for')
    })
  )
  .output(
    z.object({
      cost: z.any().describe('Cost breakdown including rates, recipient count, and totals')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.getCampaignCost(ctx.input.campaignId);

    return {
      output: { cost: result },
      message: `Cost estimate for campaign **${ctx.input.campaignId}**: ${JSON.stringify(result)}`
    };
  })
  .build();

// ---- Delete Campaign ----

export let deleteCampaign = SlateTool.create(spec, {
  name: 'Delete Campaign',
  key: 'delete_campaign',
  description: `Permanently delete an unbooked campaign. Campaigns that have already been booked or dispatched cannot be deleted.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      campaignId: z.number().describe('ID of the campaign to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, region: ctx.config.region });

    let result = await client.deleteCampaign(ctx.input.campaignId);

    return {
      output: { success: result.success === true },
      message: `Campaign **${ctx.input.campaignId}** deleted.`
    };
  })
  .build();
