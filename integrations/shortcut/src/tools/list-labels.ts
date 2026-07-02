import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `Lists all labels in the workspace. Labels can be applied to stories and epics for organization and filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      labels: z
        .array(
          z.object({
            labelId: z.number().describe('Label ID'),
            name: z.string().describe('Label name'),
            color: z.string().nullable().describe('Label color hex code'),
            description: z.string().describe('Label description'),
            archived: z.boolean().describe('Whether the label is archived'),
            numStoriesTotal: z.number().describe('Number of stories with this label')
          })
        )
        .describe('List of all labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let labels = await client.listLabels();

    let mapped = labels.map((l: any) => ({
      labelId: l.id,
      name: l.name,
      color: l.color ?? null,
      description: l.description || '',
      archived: l.archived ?? false,
      numStoriesTotal: l.stats?.num_stories_total ?? l.num_stories_total ?? 0
    }));

    return {
      output: { labels: mapped },
      message: `Found **${mapped.length}** labels`
    };
  })
  .build();
