import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { spec } from '../spec';

export let manageSegment = SlateTool.create(spec, {
  name: 'Manage Segment',
  key: 'manage_segment',
  description: `Create, update, or delete a user segment in a LaunchDarkly environment. Segments group contexts for bulk flag targeting. Use semantic patch instructions to add/remove included or excluded context keys.`,
  instructions: [
    'To create, set action to "create" with segmentKey, name, and optionally description and tags.',
    'To update, set action to "update" with semantic patch instructions like "addIncludedTargets", "removeIncludedTargets", "addExcludedTargets", "removeExcludedTargets", "updateName".',
    'To delete, set action to "delete" with the segmentKey.'
  ]
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      projectKey: z.string().optional().describe('Project key. Falls back to config default.'),
      environmentKey: z
        .string()
        .optional()
        .describe('Environment key. Falls back to config default.'),
      segmentKey: z.string().describe('Segment key'),
      name: z.string().optional().describe('Segment name (required for create)'),
      description: z.string().optional().describe('Segment description'),
      tags: z.array(z.string()).optional().describe('Segment tags'),
      instructions: z
        .array(z.record(z.string(), z.any()))
        .optional()
        .describe('Semantic patch instructions for updating the segment')
    })
  )
  .output(
    z.object({
      segmentKey: z.string().describe('Segment key'),
      name: z.string().optional().describe('Segment name'),
      deleted: z.boolean().optional().describe('Whether the segment was deleted'),
      includedCount: z.number().optional().describe('Number of included targets'),
      excludedCount: z.number().optional().describe('Number of excluded targets')
    })
  )
  .handleInvocation(async ctx => {
    let projectKey = ctx.input.projectKey ?? ctx.config.projectKey;
    if (!projectKey) {
      throw new Error('projectKey is required.');
    }
    let envKey = ctx.input.environmentKey ?? ctx.config.environmentKey;
    if (!envKey) {
      throw new Error('environmentKey is required.');
    }

    let client = new LaunchDarklyClient(ctx.auth.token);
    let { action, segmentKey } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required when creating a segment.');
      }
      let segment = await client.createSegment(projectKey, envKey, {
        key: segmentKey,
        name: ctx.input.name,
        description: ctx.input.description,
        tags: ctx.input.tags
      });

      return {
        output: {
          segmentKey: segment.key,
          name: segment.name,
          includedCount: (segment.included ?? []).length,
          excludedCount: (segment.excluded ?? []).length
        },
        message: `Created segment **${segment.name}** (\`${segment.key}\`) in \`${envKey}\`.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.instructions || ctx.input.instructions.length === 0) {
        throw new Error('instructions are required when updating a segment.');
      }
      let segment = await client.updateSegment(
        projectKey,
        envKey,
        segmentKey,
        ctx.input.instructions
      );

      return {
        output: {
          segmentKey: segment.key,
          name: segment.name,
          includedCount: (segment.included ?? []).length,
          excludedCount: (segment.excluded ?? []).length
        },
        message: `Updated segment **${segment.name}** (\`${segment.key}\`) in \`${envKey}\`.`
      };
    }

    // delete
    await client.deleteSegment(projectKey, envKey, segmentKey);
    return {
      output: {
        segmentKey,
        deleted: true
      },
      message: `Deleted segment \`${segmentKey}\` from \`${envKey}\`.`
    };
  })
  .build();
