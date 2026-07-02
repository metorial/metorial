import { SlateTool } from 'slates';
import { z } from 'zod';
import { ElasticsearchClient } from '../lib/client';
import { elasticsearchServiceError } from '../lib/errors';
import { spec } from '../spec';

export let manageSnapshotTool = SlateTool.create(spec, {
  name: 'Manage Snapshot',
  key: 'manage_snapshot',
  description: `Create, restore, delete, or retrieve snapshots and snapshot repositories for cluster backups. Snapshots allow you to back up indices and cluster state for disaster recovery.`,
  instructions: [
    'A snapshot repository must be registered before creating snapshots',
    'For "create_repository", provide repositoryType (fs, s3, etc.) and repositorySettings',
    'For "create", provide repositoryName and snapshotName, optionally limit to specific indices'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create_repository', 'list_repositories', 'create', 'get', 'delete', 'restore'])
        .describe('Snapshot action to perform'),
      repositoryName: z.string().optional().describe('Snapshot repository name'),
      repositoryType: z
        .string()
        .optional()
        .describe(
          'Repository type (e.g., fs, s3, azure, gcs) - required for create_repository'
        ),
      repositorySettings: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Repository settings (e.g., location, bucket) - required for create_repository'
        ),
      snapshotName: z
        .string()
        .optional()
        .describe('Snapshot name (required for create, get, delete, restore)'),
      indices: z
        .string()
        .optional()
        .describe('Comma-separated list of indices to include in the snapshot'),
      restoreOptions: z
        .object({
          indices: z.string().optional().describe('Comma-separated indices to restore'),
          renamePattern: z
            .string()
            .optional()
            .describe('Regex pattern to rename restored indices'),
          renameReplacement: z
            .string()
            .optional()
            .describe('Replacement string for renamed indices')
        })
        .optional()
        .describe('Options for restore action')
    })
  )
  .output(
    z.object({
      acknowledged: z.boolean().optional().describe('Whether the request was acknowledged'),
      snapshot: z.record(z.string(), z.any()).optional().describe('Snapshot details'),
      repositories: z.record(z.string(), z.any()).optional().describe('Repository details'),
      restoreDetails: z
        .record(z.string(), z.any())
        .optional()
        .describe('Restore operation details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ElasticsearchClient({
      baseUrl: ctx.auth.baseUrl,
      authHeader: ctx.auth.authHeader
    });

    switch (ctx.input.action) {
      case 'create_repository': {
        if (!ctx.input.repositoryName)
          throw elasticsearchServiceError('repositoryName is required');
        if (!ctx.input.repositoryType)
          throw elasticsearchServiceError('repositoryType is required');
        let body = {
          type: ctx.input.repositoryType,
          settings: ctx.input.repositorySettings || {}
        };
        let result = await client.createSnapshotRepository(ctx.input.repositoryName, body);
        return {
          output: { acknowledged: result.acknowledged ?? true },
          message: `Snapshot repository **${ctx.input.repositoryName}** created (type: ${ctx.input.repositoryType}).`
        };
      }
      case 'list_repositories': {
        let result = await client.getSnapshotRepository(ctx.input.repositoryName);
        return {
          output: { repositories: result },
          message: `Retrieved snapshot repositories.`
        };
      }
      case 'create': {
        if (!ctx.input.repositoryName || !ctx.input.snapshotName) {
          throw elasticsearchServiceError('repositoryName and snapshotName are required');
        }
        let body: Record<string, any> = {};
        if (ctx.input.indices) body.indices = ctx.input.indices;
        let result = await client.createSnapshot(
          ctx.input.repositoryName,
          ctx.input.snapshotName,
          body
        );
        return {
          output: { snapshot: result, acknowledged: true },
          message: `Snapshot **${ctx.input.snapshotName}** creation started in repository **${ctx.input.repositoryName}**.`
        };
      }
      case 'get': {
        if (!ctx.input.repositoryName || !ctx.input.snapshotName) {
          throw elasticsearchServiceError('repositoryName and snapshotName are required');
        }
        let result = await client.getSnapshot(
          ctx.input.repositoryName,
          ctx.input.snapshotName
        );
        return {
          output: { snapshot: result },
          message: `Retrieved snapshot **${ctx.input.snapshotName}**.`
        };
      }
      case 'delete': {
        if (!ctx.input.repositoryName || !ctx.input.snapshotName) {
          throw elasticsearchServiceError('repositoryName and snapshotName are required');
        }
        let result = await client.deleteSnapshot(
          ctx.input.repositoryName,
          ctx.input.snapshotName
        );
        return {
          output: { acknowledged: result.acknowledged ?? true },
          message: `Snapshot **${ctx.input.snapshotName}** deleted from repository **${ctx.input.repositoryName}**.`
        };
      }
      case 'restore': {
        if (!ctx.input.repositoryName || !ctx.input.snapshotName) {
          throw elasticsearchServiceError('repositoryName and snapshotName are required');
        }
        let body: Record<string, any> = {};
        if (ctx.input.restoreOptions) {
          if (ctx.input.restoreOptions.indices)
            body.indices = ctx.input.restoreOptions.indices;
          if (ctx.input.restoreOptions.renamePattern)
            body.rename_pattern = ctx.input.restoreOptions.renamePattern;
          if (ctx.input.restoreOptions.renameReplacement)
            body.rename_replacement = ctx.input.restoreOptions.renameReplacement;
        }
        let result = await client.restoreSnapshot(
          ctx.input.repositoryName,
          ctx.input.snapshotName,
          body
        );
        return {
          output: { restoreDetails: result },
          message: `Restore from snapshot **${ctx.input.snapshotName}** started.`
        };
      }
    }
  })
  .build();
