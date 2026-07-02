import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageSegment = SlateTool.create(spec, {
  name: 'Manage Segment',
  key: 'manage_segment',
  description: `Create, delete, or manage keys in a user segment. Supports creating segments, activating them in environments, uploading/removing keys, and fetching current keys. Segments are used for targeting groups of users in feature flag rules.`,
  instructions: [
    'Use action "create" to create a new segment in a workspace.',
    'Use action "delete" to permanently remove a segment from all environments.',
    'Use action "activate" to enable a segment in a specific environment.',
    'Use action "deactivate" to disable a segment in a specific environment.',
    'Use action "upload_keys" to add keys to a segment in an environment (max 10,000 per call).',
    'Use action "remove_keys" to remove keys from a segment in an environment.',
    'Use action "get_keys" to list current keys in a segment for a given environment.'
  ]
})
  .input(
    z.object({
      workspaceId: z
        .string()
        .optional()
        .describe('Workspace ID. Falls back to the configured default.'),
      action: z
        .enum([
          'create',
          'delete',
          'activate',
          'deactivate',
          'upload_keys',
          'remove_keys',
          'get_keys'
        ])
        .describe('Operation to perform on the segment.'),
      segmentName: z.string().describe('Name of the segment.'),
      trafficTypeId: z
        .string()
        .optional()
        .describe('Traffic type ID (required for "create" action).'),
      description: z
        .string()
        .optional()
        .describe('Segment description (for "create" action).'),
      environmentId: z
        .string()
        .optional()
        .describe(
          'Environment ID (required for activate, deactivate, upload_keys, remove_keys, get_keys).'
        ),
      keys: z.array(z.string()).optional().describe('Keys to upload or remove.'),
      comment: z.string().optional().describe('Comment for key removal.')
    })
  )
  .output(
    z.object({
      segmentName: z.string(),
      action: z.string(),
      success: z.boolean(),
      keys: z.array(z.string()).optional(),
      keyCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    let client = new Client({ token: ctx.auth.token });

    switch (ctx.input.action) {
      case 'create': {
        if (!wsId) throw new Error('workspaceId is required for creating segments.');
        if (!ctx.input.trafficTypeId)
          throw new Error('trafficTypeId is required to create a segment.');
        await client.createSegment(wsId, ctx.input.trafficTypeId, {
          name: ctx.input.segmentName,
          description: ctx.input.description
        });
        return {
          output: { segmentName: ctx.input.segmentName, action: 'create', success: true },
          message: `Created segment **${ctx.input.segmentName}**.`
        };
      }

      case 'delete': {
        if (!wsId) throw new Error('workspaceId is required for deleting segments.');
        await client.deleteSegment(wsId, ctx.input.segmentName);
        return {
          output: { segmentName: ctx.input.segmentName, action: 'delete', success: true },
          message: `Deleted segment **${ctx.input.segmentName}**.`
        };
      }

      case 'activate': {
        let envId = ctx.input.environmentId ?? ctx.config.environmentId;
        if (!envId) throw new Error('environmentId is required to activate a segment.');
        await client.activateSegmentInEnv(envId, ctx.input.segmentName);
        return {
          output: { segmentName: ctx.input.segmentName, action: 'activate', success: true },
          message: `Activated segment **${ctx.input.segmentName}** in environment **${envId}**.`
        };
      }

      case 'deactivate': {
        let envId = ctx.input.environmentId ?? ctx.config.environmentId;
        if (!envId) throw new Error('environmentId is required to deactivate a segment.');
        await client.deactivateSegmentInEnv(envId, ctx.input.segmentName);
        return {
          output: { segmentName: ctx.input.segmentName, action: 'deactivate', success: true },
          message: `Deactivated segment **${ctx.input.segmentName}** in environment **${envId}**.`
        };
      }

      case 'upload_keys': {
        let envId = ctx.input.environmentId ?? ctx.config.environmentId;
        if (!envId) throw new Error('environmentId is required to upload keys.');
        if (!ctx.input.keys || ctx.input.keys.length === 0)
          throw new Error('keys array is required and must not be empty.');
        await client.uploadSegmentKeys(envId, ctx.input.segmentName, ctx.input.keys);
        return {
          output: {
            segmentName: ctx.input.segmentName,
            action: 'upload_keys',
            success: true,
            keyCount: ctx.input.keys.length
          },
          message: `Uploaded **${ctx.input.keys.length}** keys to segment **${ctx.input.segmentName}**.`
        };
      }

      case 'remove_keys': {
        let envId = ctx.input.environmentId ?? ctx.config.environmentId;
        if (!envId) throw new Error('environmentId is required to remove keys.');
        if (!ctx.input.keys || ctx.input.keys.length === 0)
          throw new Error('keys array is required and must not be empty.');
        await client.removeSegmentKeys(
          envId,
          ctx.input.segmentName,
          ctx.input.keys,
          ctx.input.comment
        );
        return {
          output: {
            segmentName: ctx.input.segmentName,
            action: 'remove_keys',
            success: true,
            keyCount: ctx.input.keys.length
          },
          message: `Removed **${ctx.input.keys.length}** keys from segment **${ctx.input.segmentName}**.`
        };
      }

      case 'get_keys': {
        let envId = ctx.input.environmentId ?? ctx.config.environmentId;
        if (!envId) throw new Error('environmentId is required to get keys.');
        let result = await client.getSegmentKeys(envId, ctx.input.segmentName);
        let keys = result.keys.map(k => k.key);
        return {
          output: {
            segmentName: ctx.input.segmentName,
            action: 'get_keys',
            success: true,
            keys,
            keyCount: keys.length
          },
          message: `Segment **${ctx.input.segmentName}** has **${keys.length}** keys.`
        };
      }
    }
  })
  .build();
