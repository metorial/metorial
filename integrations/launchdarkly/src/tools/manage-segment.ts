import { SlateTool } from 'slates';
import { z } from 'zod';
import { LaunchDarklyClient } from '../lib/client';
import { requireEnvironmentKey, requireInput, requireProjectKey } from '../lib/inputs';
import { spec } from '../spec';

export let manageSegment = SlateTool.create(spec, {
  name: 'Manage Segment',
  key: 'manage_segment',
  description: `Create, update, or delete a user segment in a LaunchDarkly environment. Segments group contexts for bulk flag targeting. Use semantic patch instructions to add/remove included or excluded context keys.`,
  instructions: [
    'To create, set action to "create" with segmentKey, name, and optionally description and tags.',
    'To update, set action to "update" with semantic patch instructions like "addIncludedTargets", "removeIncludedTargets", "addExcludedTargets", "removeExcludedTargets", "updateName".',
    'To delete, set action to "delete" with the segmentKey.'
  ],
  tags: { destructive: true }
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
        .describe('Semantic patch instructions for updating the segment'),
      comment: z
        .string()
        .optional()
        .describe('Optional comment recorded in LaunchDarkly change history')
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
    let projectKey = requireProjectKey(ctx.input.projectKey, ctx.config.projectKey);
    let envKey = requireEnvironmentKey(ctx.input.environmentKey, ctx.config.environmentKey);

    let client = new LaunchDarklyClient(ctx.auth.token, ctx.auth.baseUrl);
    let { action, segmentKey } = ctx.input;

    if (action === 'create') {
      requireInput(
        ctx.input.name,
        'name is required when creating a segment.',
        'launchdarkly_segment_name_required'
      );
      let segment = await client.createSegment(projectKey, envKey, {
        key: segmentKey,
        name: ctx.input.name!,
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
      requireInput(
        ctx.input.instructions?.length,
        'instructions are required when updating a segment.',
        'launchdarkly_segment_instructions_required'
      );
      let segment = await client.updateSegment(
        projectKey,
        envKey,
        segmentKey,
        ctx.input.instructions!,
        { comment: ctx.input.comment }
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
