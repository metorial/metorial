import { SlateTool } from 'slates';
import { z } from 'zod';
import { SendlaneClient } from '../lib/client';
import { spec } from '../spec';

export let manageContactTags = SlateTool.create(spec, {
  name: 'Manage Contact Tags',
  key: 'manage_contact_tags',
  description: `Add or remove tags from a contact. Tags are labels that help you segment contacts based on interests, activity, and behavior. Use the **add** action to assign tags and **remove** to unassign them.`,
  instructions: [
    'Use the "add" action to assign one or more tags to a contact.',
    'Use the "remove" action to unassign a single tag from a contact.'
  ]
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact'),
      action: z.enum(['add', 'remove']).describe('Whether to add or remove tags'),
      tagIds: z
        .array(z.number())
        .describe('Tag IDs to add or remove. When removing, only the first tag ID is used.')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      tags: z
        .array(
          z.object({
            tagId: z.number(),
            tagName: z.string()
          })
        )
        .describe('Updated list of tags on the contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SendlaneClient(ctx.auth.token);

    if (ctx.input.action === 'add') {
      await client.addTagsToContact(ctx.input.contactId, ctx.input.tagIds);
    } else {
      for (let tagId of ctx.input.tagIds) {
        await client.removeTagFromContact(ctx.input.contactId, tagId);
      }
    }

    let updatedTags = await client.getContactTags(ctx.input.contactId);

    return {
      output: {
        success: true,
        tags: updatedTags.map(t => ({
          tagId: t.id,
          tagName: t.name ?? ''
        }))
      },
      message: `${ctx.input.action === 'add' ? 'Added' : 'Removed'} ${ctx.input.tagIds.length} tag(s) ${ctx.input.action === 'add' ? 'to' : 'from'} contact ${ctx.input.contactId}. Contact now has **${updatedTags.length}** tags.`
    };
  })
  .build();
