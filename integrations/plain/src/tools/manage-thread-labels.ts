import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageThreadLabels = SlateTool.create(spec, {
  name: 'Manage Thread Labels',
  key: 'manage_thread_labels',
  description: `Add or remove labels on a thread. Use the **addLabelTypeIds** field to add labels and **removeLabelIds** to remove them. You can do both in a single call. Use the list_label_types tool to discover available label types.`,
  instructions: [
    'To add labels, provide label type IDs (from list_label_types).',
    'To remove labels, provide the label IDs that are currently on the thread (from get_thread).'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      threadId: z.string().describe('Plain thread ID'),
      addLabelTypeIds: z
        .array(z.string())
        .optional()
        .describe('Label type IDs to add to the thread'),
      removeLabelIds: z
        .array(z.string())
        .optional()
        .describe('Label IDs to remove from the thread')
    })
  )
  .output(
    z.object({
      added: z.number().describe('Number of labels added'),
      removed: z.number().describe('Number of labels removed')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let added = 0;
    let removed = 0;

    if (ctx.input.addLabelTypeIds && ctx.input.addLabelTypeIds.length > 0) {
      await client.addLabels({
        threadId: ctx.input.threadId,
        labelTypeIds: ctx.input.addLabelTypeIds
      });
      added = ctx.input.addLabelTypeIds.length;
    }

    if (ctx.input.removeLabelIds && ctx.input.removeLabelIds.length > 0) {
      await client.removeLabels({
        threadId: ctx.input.threadId,
        labelIds: ctx.input.removeLabelIds
      });
      removed = ctx.input.removeLabelIds.length;
    }

    return {
      output: { added, removed },
      message: `Labels updated: **${added}** added, **${removed}** removed`
    };
  })
  .build();
