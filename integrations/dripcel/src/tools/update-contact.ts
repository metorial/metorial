import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateContact = SlateTool.create(spec, {
  name: 'Update Contact',
  key: 'update_contact',
  description: `Update a contact's tags or opt-out status. Supports adding/removing tags by ID or name, and opting a contact out of specific campaigns or all campaigns.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      cell: z.string().describe('Cell number (MSISDN) of the contact'),
      addTagIds: z.array(z.string()).optional().describe('Tag IDs to add to the contact'),
      addTagNames: z.array(z.string()).optional().describe('Tag names to add to the contact'),
      removeTagIds: z
        .array(z.string())
        .optional()
        .describe('Tag IDs to remove from the contact'),
      removeTagNames: z
        .array(z.string())
        .optional()
        .describe('Tag names to remove from the contact'),
      optOutCampaignIds: z
        .array(z.string())
        .optional()
        .describe('Campaign IDs to opt the contact out of'),
      optOutAll: z.boolean().optional().describe('Opt the contact out of all campaigns'),
      createMissingContact: z
        .boolean()
        .optional()
        .describe(
          'Create the contact if it does not exist (for tag add and opt-out operations)'
        )
    })
  )
  .output(
    z.object({
      tagsAdded: z.boolean().describe('Whether tags were added'),
      tagsRemoved: z.boolean().describe('Whether tags were removed'),
      optedOut: z.boolean().describe('Whether an opt-out was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let tagsAdded = false;
    let tagsRemoved = false;
    let optedOut = false;

    if (ctx.input.addTagIds?.length || ctx.input.addTagNames?.length) {
      await client.addTagsToContact(ctx.input.cell, {
        tagIds: ctx.input.addTagIds,
        tags: ctx.input.addTagNames,
        createMissingContact: ctx.input.createMissingContact
      });
      tagsAdded = true;
    }

    if (ctx.input.removeTagIds?.length || ctx.input.removeTagNames?.length) {
      await client.removeTagsFromContact(ctx.input.cell, {
        tagIds: ctx.input.removeTagIds,
        tags: ctx.input.removeTagNames
      });
      tagsRemoved = true;
    }

    if (ctx.input.optOutCampaignIds?.length || ctx.input.optOutAll) {
      await client.optOutContact(ctx.input.cell, {
        campaignIds: ctx.input.optOutCampaignIds,
        all: ctx.input.optOutAll,
        createMissingContact: ctx.input.createMissingContact
      });
      optedOut = true;
    }

    let actions: string[] = [];
    if (tagsAdded) actions.push('added tags');
    if (tagsRemoved) actions.push('removed tags');
    if (optedOut) actions.push('opted out');

    return {
      output: { tagsAdded, tagsRemoved, optedOut },
      message:
        actions.length > 0
          ? `Updated contact **${ctx.input.cell}**: ${actions.join(', ')}.`
          : `No updates performed for contact **${ctx.input.cell}** — no operations specified.`
    };
  })
  .build();
