import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTrainings = SlateTool.create(spec, {
  name: 'List Trainings',
  key: 'list_trainings',
  description: `List recent training jobs for your account, sorted by creation time (newest first).`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      cursor: z.string().optional().describe('Pagination cursor from a previous response')
    })
  )
  .output(
    z.object({
      trainings: z.array(
        z.object({
          trainingId: z.string().describe('Training ID'),
          model: z.string().optional().describe('Base model'),
          version: z.string().optional().describe('Base model version'),
          status: z.string().describe('Training status'),
          source: z.enum(['api', 'web']).optional().describe('How the training was created'),
          createdAt: z.string().describe('Creation timestamp'),
          completedAt: z.string().optional().nullable().describe('Completion timestamp')
        })
      ),
      nextCursor: z.string().optional().nullable().describe('Cursor for next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTrainings({ cursor: ctx.input.cursor });

    let trainings = (result.results || []).map((t: any) => ({
      trainingId: t.id,
      model: t.model,
      version: t.version,
      status: t.status,
      source: t.source,
      createdAt: t.created_at,
      completedAt: t.completed_at
    }));

    let nextCursor = result.next ? new URL(result.next).searchParams.get('cursor') : null;

    return {
      output: { trainings, nextCursor },
      message: `Found **${trainings.length}** trainings.`
    };
  })
  .build();
