import { SlateTool } from 'slates';
import { z } from 'zod';
import { createTimelyClient } from '../lib/client';
import { accountIdSchema } from '../lib/schemas';
import { spec } from '../spec';

let labelSchema = z.object({
  labelId: z.number().describe('Label ID'),
  name: z.string().describe('Label name'),
  parentId: z.number().nullable().describe('Parent label ID for hierarchy'),
  emoji: z.string().nullable().describe('Custom emoji'),
  active: z.boolean().describe('Whether the label is active'),
  children: z.array(z.any()).optional().describe('Child labels')
});

export let listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `Call list_accounts to choose a workspace when needed. Retrieve labels (tags) from Timely. Labels support a hierarchical parent/child structure and are used to classify work on time entries.`,
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountId: accountIdSchema,
      limit: z.number().optional().describe('Max labels to return'),
      offset: z.number().optional().describe('Offset for pagination')
    })
  )
  .output(
    z.object({
      labels: z.array(labelSchema),
      count: z.number().describe('Number of labels returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = await createTimelyClient(ctx);

    let labels = await client.listLabels({
      limit: ctx.input.limit,
      offset: ctx.input.offset
    });

    let mapped = labels.map((l: any) => ({
      labelId: l.id,
      name: l.name,
      parentId: l.parent_id ?? null,
      emoji: l.emoji ?? null,
      active: l.active ?? true,
      children: l.children ?? []
    }));

    return {
      output: { labels: mapped, count: mapped.length },
      message: `Found **${mapped.length}** labels.`
    };
  })
  .build();
