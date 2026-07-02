import { SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let updateEmailCampaign = SlateTool.create(spec, {
  name: 'Update Email Campaign',
  key: 'update_email_campaign',
  description: `Update an email campaign's settings, name, provider configuration, or email sequence steps. Provide only the fields you want to update.`,
  instructions: ['Provide the campaignId and at least one field to update.']
})
  .input(
    z.object({
      campaignId: z.string().describe('ID of the campaign to update'),
      name: z.string().optional().describe('New campaign name'),
      globalSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Global campaign settings to update'),
      providerSettings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Provider-specific settings to update'),
      steps: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Email sequence steps to set for the campaign')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the update succeeded'),
      updatedFields: z.array(z.string()).describe('Which fields were updated')
    })
  )
  .handleInvocation(async ctx => {
    let client = new EmeliaClient(ctx.auth.token);
    let { campaignId, name, globalSettings, providerSettings, steps } = ctx.input;
    let updatedFields: string[] = [];

    if (name) {
      await client.updateCampaignName(campaignId, name);
      updatedFields.push('name');
    }

    if (globalSettings) {
      await client.updateCampaignGlobalSettings(campaignId, globalSettings);
      updatedFields.push('globalSettings');
    }

    if (providerSettings) {
      await client.updateCampaignProviderSettings(campaignId, providerSettings);
      updatedFields.push('providerSettings');
    }

    if (steps) {
      await client.updateCampaignSteps(campaignId, steps);
      updatedFields.push('steps');
    }

    return {
      output: { success: true, updatedFields },
      message: `Updated email campaign **${campaignId}**: ${updatedFields.join(', ')}.`
    };
  })
  .build();
