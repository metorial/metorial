import { SlateTool } from 'slates';
import { z } from 'zod';
import { AutoboundClient } from '../lib/client';
import { spec } from '../spec';

export let importCampaignContact = SlateTool.create(spec, {
  name: 'Import Campaign Contact',
  key: 'import_campaign_contact',
  description: `Import a prospect into an Autobound AI Studio campaign and trigger content generation. The campaign must already be created in AI Studio. Content can be received synchronously in the response or asynchronously via a configured webhook.

Use this to programmatically add contacts to your AI-powered outreach campaigns.`,
  instructions: [
    'The campaignId is obtained from AI Studio: Actions > Add Contacts > Monitor from API request.',
    'contactEmail is required. Additional fields like contactName, contactJobTitle, and contactCompanyName help improve content personalization.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      campaignId: z.string().describe('AI Studio campaign ID to import the contact into'),
      contactEmail: z.string().describe('Prospect email address (required)'),
      contactName: z.string().optional().describe('Prospect full name'),
      contactJobTitle: z.string().optional().describe('Prospect job title'),
      contactCompanyName: z.string().optional().describe('Prospect company name'),
      contactCompanySize: z.number().optional().describe('Prospect company employee count')
    })
  )
  .output(
    z.object({
      campaignId: z.string().describe('Campaign the contact was imported into'),
      contactEmail: z.string().describe('Email of the imported contact'),
      generatedContent: z
        .any()
        .optional()
        .describe('Synchronously generated content (if available)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AutoboundClient(ctx.auth.token);

    ctx.info(
      `Importing contact ${ctx.input.contactEmail} into campaign ${ctx.input.campaignId}...`
    );

    let result = await client.importCampaignContact({
      campaignId: ctx.input.campaignId,
      contactEmail: ctx.input.contactEmail,
      contactName: ctx.input.contactName,
      contactJobTitle: ctx.input.contactJobTitle,
      contactCompanyName: ctx.input.contactCompanyName,
      contactCompanySize: ctx.input.contactCompanySize
    });

    return {
      output: {
        campaignId: ctx.input.campaignId,
        contactEmail: ctx.input.contactEmail,
        generatedContent: result
      },
      message: `Successfully imported **${ctx.input.contactEmail}** into campaign **${ctx.input.campaignId}**.`
    };
  })
  .build();
