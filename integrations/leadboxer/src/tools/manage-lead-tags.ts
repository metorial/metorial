import { SlateTool } from 'slates';
import { z } from 'zod';
import { LeadBoxerClient } from '../lib/client';
import { spec } from '../spec';

export let manageLeadTags = SlateTool.create(spec, {
  name: 'Manage Lead Tags',
  key: 'manage_lead_tags',
  description: `Add, remove, or replace tags on a lead. Tags help categorize and segment leads for sales workflows. Use "add" to append a tag, "remove" to remove a specific tag, or "replace" to overwrite all existing tags.`,
  instructions: [
    'The `leadboxerUserId` is the LeadBoxer user ID obtained from the Get Leads or Get Lead Details tool.',
    'When action is "replace", all existing tags will be overwritten with the provided tag value.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      leadboxerUserId: z.string().describe('The LeadBoxer user ID of the lead'),
      tag: z.string().describe('Tag value to add, remove, or set'),
      action: z
        .enum(['add', 'remove', 'replace'])
        .describe(
          'Action to perform: "add" appends, "remove" deletes, "replace" overwrites all tags'
        )
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the tag operation succeeded'),
      leadboxerUserId: z.string().describe('The LeadBoxer user ID'),
      tag: z.string().describe('The tag value that was operated on'),
      action: z.string().describe('The action that was performed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new LeadBoxerClient({
      token: ctx.auth.token,
      datasetId: ctx.config.datasetId
    });

    let apiAction: 'add' | 'remove' | undefined;
    if (ctx.input.action === 'add') apiAction = 'add';
    else if (ctx.input.action === 'remove') apiAction = 'remove';
    // 'replace' = omit action param, which overwrites all tags

    await client.updateLeadTags({
      leadboxerUserId: ctx.input.leadboxerUserId,
      tags: ctx.input.tag,
      action: apiAction
    });

    let output = {
      success: true,
      leadboxerUserId: ctx.input.leadboxerUserId,
      tag: ctx.input.tag,
      action: ctx.input.action
    };

    let actionLabel =
      ctx.input.action === 'add' ? 'Added' : ctx.input.action === 'remove' ? 'Removed' : 'Set';
    return {
      output,
      message: `${actionLabel} tag **${ctx.input.tag}** on lead ${ctx.input.leadboxerUserId}.`
    };
  })
  .build();
