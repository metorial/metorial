import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `Retrieve all labels used for categorizing and organizing appointments.`,
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
            color: z.string().optional().describe('Label color')
          })
        )
        .describe('List of labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let results = await client.listLabels();

    let labels = (results as any[]).map((l: any) => ({
      labelId: l.id,
      name: l.name || '',
      color: l.color || undefined
    }));

    return {
      output: { labels },
      message: `Found **${labels.length}** label(s).`
    };
  })
  .build();
