import { SlateTool } from 'slates';
import { z } from 'zod';
import { BeaconstacClient } from '../lib/client';
import { spec } from '../spec';

export let updateNfcTag = SlateTool.create(spec, {
  name: 'Update NFC Tag',
  key: 'update_nfc_tag',
  description: `Update an existing NFC tag's name, campaign, or place association. NFC tags are provisioned through hardware and cannot be created via the API, but their configuration can be modified.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      nfcTagId: z.number().describe('ID of the NFC tag to update'),
      name: z.string().optional().describe('New name for the NFC tag'),
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
      nfcTagId: z.number().describe('ID of the updated NFC tag'),
      name: z.string().describe('Updated tag name'),
      uid: z.string().optional().describe('Tag UID'),
      state: z.string().optional().describe('Tag state'),
      counter: z.number().optional().describe('Read counter'),
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

    let result = await client.updateNfcTag(ctx.input.nfcTagId, data);

    return {
      output: {
        nfcTagId: result.id,
        name: result.name,
        uid: result.uid,
        state: result.state,
        counter: result.counter,
        updatedAt: result.updated
      },
      message: `Updated NFC tag **"${result.name}"** (ID: ${result.id}).`
    };
  })
  .build();
