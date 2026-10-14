import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { projectIdSchema } from '../lib/schemas';
import { spec } from '../spec';

export let moveTasks = SlateTool.create(spec, {
  name: 'Move Tasks',
  key: 'move_tasks',
  description:
    'Move one or more TickTick tasks from their current project to another project. Call list_projects to discover source and destination project IDs, and get_project with includeTasks to discover task IDs.',
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      moves: z
        .array(
          z.object({
            taskId: z.string().min(1).describe('ID of the task to move'),
            fromProjectId: projectIdSchema.describe(
              'Source project ID. Call list_projects to discover project IDs.'
            ),
            toProjectId: projectIdSchema.describe(
              'Destination project ID. Call list_projects to discover project IDs.'
            )
          })
        )
        .min(1)
        .describe('Task move operations')
    })
  )
  .output(
    z.object({
      movedTasks: z.array(
        z.object({
          taskId: z.string().describe('Task ID confirmed by TickTick'),
          etag: z.string().optional().describe('Task version after the move')
        })
      ),
      movedCount: z.number().describe('Number of task moves confirmed by TickTick')
    })
  )
  .handleInvocation(async ctx => {
    let results = await new Client({ token: ctx.auth.token }).moveTasks(ctx.input.moves);
    return {
      output: {
        movedTasks: results.map(result => ({
          taskId: result.id,
          etag: result.etag ?? undefined
        })),
        movedCount: results.length
      },
      message: `TickTick confirmed **${results.length}** task move(s).`
    };
  })
  .build();
