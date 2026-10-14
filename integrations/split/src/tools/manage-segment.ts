import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { validatePagination } from '../lib/validation';
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
        .describe(
          'Workspace ID. Call list_workspaces to discover IDs. Falls back to the configured default.'
        ),
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
      comment: z.string().optional().describe('Comment for key upload or removal.'),
      offset: z.number().optional().describe('Pagination offset for get_keys. Defaults to 0.'),
      limit: z
        .number()
        .optional()
        .describe('Page size for get_keys, between 1 and 100. Defaults to 100.')
    })
  )
  .output(
    z.object({
      segmentName: z.string(),
      action: z.string(),
      success: z.boolean(),
      keys: z.array(z.string()).optional(),
      keyCount: z.number().optional(),
      totalKeyCount: z.number().optional(),
      offset: z.number().optional(),
      limit: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let wsId = ctx.input.workspaceId ?? ctx.config.workspaceId;
    let client = new Client(ctx.auth);

    switch (ctx.input.action) {
      case 'create': {
        if (!wsId)
          throw createApiServiceError('workspaceId is required for creating segments.');
        if (!ctx.input.trafficTypeId)
          throw createApiServiceError('trafficTypeId is required to create a segment.');
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
        if (!wsId)
          throw createApiServiceError('workspaceId is required for deleting segments.');
        await client.deleteSegment(wsId, ctx.input.segmentName);
        return {
          output: { segmentName: ctx.input.segmentName, action: 'delete', success: true },
          message: `Deleted segment **${ctx.input.segmentName}**.`
        };
      }

      case 'activate': {
        let envId = ctx.input.environmentId ?? ctx.config.environmentId;
        if (!envId)
          throw createApiServiceError('environmentId is required to activate a segment.');
        await client.activateSegmentInEnv(envId, ctx.input.segmentName);
        return {
          output: { segmentName: ctx.input.segmentName, action: 'activate', success: true },
          message: `Activated segment **${ctx.input.segmentName}** in environment **${envId}**.`
        };
      }

      case 'deactivate': {
        let envId = ctx.input.environmentId ?? ctx.config.environmentId;
        if (!envId)
          throw createApiServiceError('environmentId is required to deactivate a segment.');
        await client.deactivateSegmentInEnv(envId, ctx.input.segmentName);
        return {
          output: { segmentName: ctx.input.segmentName, action: 'deactivate', success: true },
          message: `Deactivated segment **${ctx.input.segmentName}** in environment **${envId}**.`
        };
      }

      case 'upload_keys': {
        let envId = ctx.input.environmentId ?? ctx.config.environmentId;
        if (!envId) throw createApiServiceError('environmentId is required to upload keys.');
        if (!ctx.input.keys || ctx.input.keys.length === 0)
          throw createApiServiceError('keys array is required and must not be empty.');
        if (ctx.input.keys.length > 10000) {
          throw createApiServiceError(
            'upload_keys accepts at most 10,000 keys per call. Split the keys into smaller batches.'
          );
        }
        await client.uploadSegmentKeys(
          envId,
          ctx.input.segmentName,
          ctx.input.keys,
          ctx.input.comment
        );
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
        if (!envId) throw createApiServiceError('environmentId is required to remove keys.');
        if (!ctx.input.keys || ctx.input.keys.length === 0)
          throw createApiServiceError('keys array is required and must not be empty.');
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
        if (!envId) throw createApiServiceError('environmentId is required to get keys.');
        validatePagination(ctx.input.offset, ctx.input.limit, 100);
        let result = await client.getSegmentKeys(envId, ctx.input.segmentName, {
          offset: ctx.input.offset,
          limit: ctx.input.limit
        });
        let keys = result.keys.map(k => k.key);
        return {
          output: {
            segmentName: ctx.input.segmentName,
            action: 'get_keys',
            success: true,
            keys,
            keyCount: keys.length,
            totalKeyCount: result.count,
            offset: result.offset,
            limit: result.limit
          },
          message: `Returned **${keys.length}** keys from segment **${ctx.input.segmentName}**, starting at offset ${result.offset}.`
        };
      }
    }
  })
  .build();
