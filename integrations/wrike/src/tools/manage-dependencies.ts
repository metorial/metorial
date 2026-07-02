import { SlateTool } from 'slates';
import { z } from 'zod';
import { WrikeClient } from '../lib/client';
import { spec } from '../spec';

export let listDependencies = SlateTool.create(spec, {
  name: 'List Dependencies',
  key: 'list_dependencies',
  description: `List task dependencies (predecessor/successor relationships). Can list dependencies for a specific task or by dependency IDs.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      taskId: z.string().optional().describe('Task ID to list dependencies for'),
      dependencyIds: z
        .array(z.string())
        .optional()
        .describe('Specific dependency IDs to retrieve')
    })
  )
  .output(
    z.object({
      dependencies: z.array(
        z.object({
          dependencyId: z.string(),
          predecessorId: z.string(),
          successorId: z.string(),
          relationType: z.string()
        })
      ),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let result = await client.getDependencies({
      taskId: ctx.input.taskId,
      dependencyIds: ctx.input.dependencyIds
    });

    let dependencies = result.data.map(d => ({
      dependencyId: d.id,
      predecessorId: d.predecessorId,
      successorId: d.successorId,
      relationType: d.relationType
    }));

    return {
      output: { dependencies, count: dependencies.length },
      message: `Found **${dependencies.length}** dependency(ies).`
    };
  })
  .build();

export let createDependency = SlateTool.create(spec, {
  name: 'Create Dependency',
  key: 'create_dependency',
  description: `Create a task dependency (predecessor/successor relationship) between two tasks. Used for Gantt chart views and timeline planning.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      taskId: z
        .string()
        .describe('Successor task ID (the task that depends on the predecessor)'),
      predecessorId: z.string().describe('Predecessor task ID'),
      relationType: z
        .string()
        .describe('Relation type: FinishToStart, StartToStart, FinishToFinish, StartToFinish')
    })
  )
  .output(
    z.object({
      dependencyId: z.string(),
      predecessorId: z.string(),
      successorId: z.string(),
      relationType: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    let dep = await client.createDependency(ctx.input.taskId, {
      predecessorId: ctx.input.predecessorId,
      relationType: ctx.input.relationType
    });

    return {
      output: {
        dependencyId: dep.id,
        predecessorId: dep.predecessorId,
        successorId: dep.successorId,
        relationType: dep.relationType
      },
      message: `Created ${dep.relationType} dependency from task ${dep.predecessorId} to ${dep.successorId}.`
    };
  })
  .build();

export let deleteDependency = SlateTool.create(spec, {
  name: 'Delete Dependency',
  key: 'delete_dependency',
  description: `Delete a task dependency relationship.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      dependencyId: z.string().describe('ID of the dependency to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean()
    })
  )
  .handleInvocation(async ctx => {
    let client = new WrikeClient({
      token: ctx.auth.token,
      host: ctx.auth.host
    });

    await client.deleteDependency(ctx.input.dependencyId);

    return {
      output: { deleted: true },
      message: `Deleted dependency ${ctx.input.dependencyId}.`
    };
  })
  .build();
