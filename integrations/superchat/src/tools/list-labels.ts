import { SlateTool } from 'slates';
import { z } from 'zod';
import { SuperchatClient } from '../lib/client';
import { spec } from '../spec';

let labelSchema = z.object({
  labelId: z.string().describe('Unique label identifier'),
  name: z.string().optional().describe('Label name'),
  labelUrl: z.string().optional().describe('Resource URL')
});

let mapLabel = (label: any) => ({
  labelId: label.id,
  name: label.name,
  labelUrl: label.url
});

export let listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `List all labels available in the workspace. Labels can be used to categorize conversations.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      limit: z.number().optional().describe('Maximum number of labels to return'),
      after: z.string().optional().describe('Cursor for forward pagination'),
      before: z.string().optional().describe('Cursor for backward pagination')
    })
  )
  .output(
    z.object({
      labels: z.array(labelSchema).describe('List of labels'),
      pagination: z
        .object({
          next: z.string().optional().nullable().describe('Next page cursor'),
          previous: z.string().optional().nullable().describe('Previous page cursor')
        })
        .optional()
        .describe('Pagination cursors')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });

    let result = await client.listLabels({
      limit: ctx.input.limit,
      after: ctx.input.after,
      before: ctx.input.before
    });

    let labels = (result.results || []).map(mapLabel);

    return {
      output: {
        labels,
        pagination: result.pagination
      },
      message: `Retrieved **${labels.length}** label(s).`
    };
  })
  .build();

export let getLabel = SlateTool.create(spec, {
  name: 'Get Label',
  key: 'get_label',
  description: `Retrieve a specific label by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      labelId: z.string().describe('ID of the label to retrieve')
    })
  )
  .output(labelSchema)
  .handleInvocation(async ctx => {
    let client = new SuperchatClient({ token: ctx.auth.token });
    let result = await client.getLabel(ctx.input.labelId);

    return {
      output: mapLabel(result),
      message: `Retrieved label **${result.name}** (\`${result.id}\`).`
    };
  })
  .build();
