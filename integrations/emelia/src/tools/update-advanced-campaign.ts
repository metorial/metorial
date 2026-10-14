import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { EmeliaClient } from '../lib/client';
import { spec } from '../spec';

export let updateAdvancedCampaign = SlateTool.create(spec, {
  name: 'Update Multichannel Campaign',
  key: 'update_advanced_campaign',
  description:
    'Configure an advanced multichannel campaign before launch: rename it, replace its sequence tree, update settings, or replace sender identities and recipient lists. Provided fields are applied in order and list/identity/step updates replace those collections.',
  instructions: [
    'Retrieve the campaign with manage_advanced_campaign action get before editing.',
    'Steps are a tree rooted at a START node with next, yes and no branches, not an array. Use provider stepType, delay and versions fields.',
    'Discover recipient list IDs with manage_lists action list and email provider IDs with manage_email_providers action list.'
  ]
})
  .input(
    z.object({
      campaignId: z.string().describe('Campaign ID from manage_advanced_campaign action list'),
      name: z.string().min(1).optional(),
      steps: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Complete sequence tree rooted at a START node; replaces the current sequence'
        ),
      settings: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Schedule/settings fields such as timeZone, days, start, end, dailyEmailAdded and dailyEmailLimit'
        ),
      identities: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe(
          'Sender identities, each with name and email or linkedin provider ID; replaces all identities'
        ),
      lists: z
        .array(z.string())
        .optional()
        .describe(
          'Recipient list IDs from manage_lists; replaces the campaign recipient lists'
        ),
      excludedLists: z
        .array(z.string())
        .optional()
        .describe('Exclusion list IDs, supplied together with lists')
    })
  )
  .output(z.object({ success: z.boolean(), updatedFields: z.array(z.string()) }))
  .handleInvocation(async ctx => {
    let { campaignId, name, steps, settings, identities, lists, excludedLists } = ctx.input;
    if ([name, steps, settings, identities, lists].every(value => value === undefined)) {
      throw createApiServiceError('Provide at least one field to update.');
    }
    if (excludedLists !== undefined && lists === undefined) {
      throw createApiServiceError(
        'Provide lists together with excludedLists because recipient lists are replaced together.'
      );
    }
    if (steps && steps.stepType !== 'START')
      throw createApiServiceError('The sequence tree must be rooted at a START step.');
    let client = new EmeliaClient(ctx.auth.token);
    if (settings) {
      let current = await client.getAdvancedCampaign(campaignId);
      settings = { ...current.schedule, ...settings };
    }
    let updatedFields: string[] = [];
    for (let [field, data] of [
      ['name', name === undefined ? undefined : { name }],
      ['steps', steps === undefined ? undefined : { steps }],
      ['settings', settings === undefined ? undefined : { settings }],
      ['identities', identities === undefined ? undefined : { identities }],
      [
        'recipients',
        lists === undefined
          ? undefined
          : { lists, ...(excludedLists === undefined ? {} : { excludedLists }) }
      ]
    ] as const) {
      if (data !== undefined) {
        await client.updateAdvancedCampaign(campaignId, field, data);
        updatedFields.push(field);
      }
    }
    return {
      output: { success: true, updatedFields },
      message: `Updated multichannel campaign **${campaignId}**: ${updatedFields.join(', ')}.`
    };
  })
  .build();
