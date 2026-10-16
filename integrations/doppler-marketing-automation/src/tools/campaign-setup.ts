import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, rawSchema } from '../lib/client';
import { spec } from '../spec';

export let getCampaignRecipients = SlateTool.create(spec, {
  key: 'get_campaign_recipients',
  name: 'Get Campaign Recipients',
  description: 'Retrieve the lists and segments selected as recipients of a campaign.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ campaignId: z.number().describe('Campaign ID from get_campaigns') }))
  .output(
    z.object({
      campaignId: z.number(),
      raw: rawSchema.describe('Recipient configuration returned by Doppler')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountEmail: ctx.config.accountEmail });
    let raw = await client.getCampaignRecipients(ctx.input.campaignId);
    return {
      output: { campaignId: ctx.input.campaignId, raw },
      message: 'Retrieved campaign recipients.'
    };
  })
  .build();

export let setCampaignRecipients = SlateTool.create(spec, {
  key: 'set_campaign_recipients',
  name: 'Set Campaign Recipients',
  description:
    'Replace the recipient lists and segments for a draft campaign. Call get_lists to discover lists and get_campaign_recipients to inspect the current configuration before replacing it.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID from get_campaigns'),
      listIds: z
        .array(z.number())
        .describe(
          'Complete set of recipient list IDs from get_lists. Use an empty array when sending only to segments.'
        ),
      segmentIds: z
        .array(z.number())
        .optional()
        .describe(
          'Complete set of recipient segment IDs. Omitted segments are removed from the configuration.'
        )
    })
  )
  .output(z.object({ campaignId: z.number(), message: z.string() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountEmail: ctx.config.accountEmail });
    await client.setCampaignRecipients(
      ctx.input.campaignId,
      ctx.input.listIds,
      ctx.input.segmentIds
    );
    return {
      output: {
        campaignId: ctx.input.campaignId,
        message: 'Campaign recipients updated successfully'
      },
      message: 'Updated campaign recipients.'
    };
  })
  .build();

export let setCampaignContent = SlateTool.create(spec, {
  key: 'set_campaign_content',
  name: 'Set Campaign Content',
  description:
    'Replace the HTML content of a draft email campaign. Personalization fields use the [[[FIELDNAME]]] syntax. Configure recipients separately before sending.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      campaignId: z.number().describe('Campaign ID from get_campaigns'),
      html: z.string().describe('Complete HTML email content')
    })
  )
  .output(z.object({ campaignId: z.number(), message: z.string() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountEmail: ctx.config.accountEmail });
    await client.setCampaignContent(ctx.input.campaignId, ctx.input.html);
    return {
      output: {
        campaignId: ctx.input.campaignId,
        message: 'Campaign content updated successfully'
      },
      message: 'Updated campaign HTML content.'
    };
  })
  .build();

export let downloadCampaignContent = SlateTool.create(spec, {
  key: 'download_campaign_content',
  name: 'Download Campaign Content',
  description: 'Download the HTML content of a campaign as a file.',
  tags: { readOnly: true, destructive: false }
})
  .input(z.object({ campaignId: z.number().describe('Campaign ID from get_campaigns') }))
  .output(z.object({ campaignId: z.number(), message: z.string() }))
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token, accountEmail: ctx.config.accountEmail });
    await ctx.addAttachment({
      type: 'url',
      url: client.getCampaignContentUrl(ctx.input.campaignId),
      headers: { Authorization: `token ${ctx.auth.token}` }
    });
    return {
      output: {
        campaignId: ctx.input.campaignId,
        message: 'Campaign HTML is available to download'
      },
      message: 'Campaign HTML is available to download.'
    };
  })
  .build();
