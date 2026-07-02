import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLabelTypes = SlateTool.create(spec, {
  name: 'List Label Types',
  key: 'list_label_types',
  description: `List all available label types in the workspace. Label types define the categories you can apply to threads (e.g., "Bug", "Feature Request"). Use the returned IDs when adding labels to threads.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      first: z.number().optional().default(50).describe('Number of label types to return'),
      after: z.string().optional().describe('Cursor for pagination')
    })
  )
  .output(
    z.object({
      labelTypes: z.array(
        z.object({
          labelTypeId: z.string().describe('Label type ID'),
          name: z.string().describe('Label type name'),
          icon: z.string().nullable().describe('Label type icon'),
          isArchived: z.boolean().describe('Whether the label type is archived')
        })
      ),
      hasNextPage: z.boolean().describe('Whether more pages exist'),
      endCursor: z.string().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let res = await client.getLabelTypes(ctx.input.first, ctx.input.after);

    let labelTypes = (res.edges || []).map((edge: any) => ({
      labelTypeId: edge.node.id,
      name: edge.node.name,
      icon: edge.node.icon,
      isArchived: edge.node.isArchived
    }));

    return {
      output: {
        labelTypes,
        hasNextPage: res.pageInfo?.hasNextPage ?? false,
        endCursor: res.pageInfo?.endCursor ?? null
      },
      message: `Found **${labelTypes.length}** label types`
    };
  })
  .build();
