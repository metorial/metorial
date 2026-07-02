import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let updateBeacon = SlateTool.create(spec, {
  name: 'Update Beacon',
  key: 'update_beacon',
  description: `Update an existing BLE beacon's name, campaign, place association, or other properties. Beacons are provisioned through hardware and cannot be created via the API, but their configuration can be modified.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      beaconId: z.number().describe('ID of the beacon to update'),
      name: z.string().optional().describe('New name for the beacon'),
      placeId: z.number().optional().describe('New place ID to associate with'),
      campaign: z
        .object({
          contentType: z
            .number()
            .describe('Campaign type: 0=None, 1=Custom URL, 2=Landing Page, 3=Form'),
          customUrl: z.string().optional().describe('Target URL'),
          markdownCardId: z.number().optional().describe('Landing page ID'),
          formId: z.number().optional().describe('Form ID'),
          active: z.boolean().optional().describe('Whether the campaign is active')
        })
        .optional()
        .describe('Updated campaign configuration')
    })
  )
  .output(
    z.object({
      beaconId: z.number().describe('ID of the updated beacon'),
      name: z.string().describe('Updated beacon name'),
      state: z.string().optional().describe('Beacon state'),
      battery: z.number().optional().describe('Battery level'),
      heartbeat: z.string().optional().describe('Last heartbeat'),
      updatedAt: z.string().optional().describe('Update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BeaconstacClient({
      token: ctx.auth.token,
      organizationId: ctx.config.organizationId
    });

    let data: Record<string, unknown> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.placeId !== undefined) data.place = ctx.input.placeId;

    if (ctx.input.campaign) {
      let campaignData: Record<string, unknown> = {
        content_type: ctx.input.campaign.contentType
      };
      if (ctx.input.campaign.customUrl !== undefined)
        campaignData.custom_url = ctx.input.campaign.customUrl;
      if (ctx.input.campaign.markdownCardId !== undefined)
        campaignData.markdown_card = ctx.input.campaign.markdownCardId;
      if (ctx.input.campaign.formId !== undefined)
        campaignData.form = ctx.input.campaign.formId;
      if (ctx.input.campaign.active !== undefined)
        campaignData.campaign_active = ctx.input.campaign.active;
      data.campaign = campaignData;
    }

    let result = await client.updateBeacon(ctx.input.beaconId, data);

    return {
      output: {
        beaconId: result.id,
        name: result.name,
        state: result.state,
        battery: result.battery,
        heartbeat: result.heartbeat,
        updatedAt: result.updated
      },
      message: `Updated beacon **"${result.name}"** (ID: ${result.id}).`
    };
  })
  .build();
