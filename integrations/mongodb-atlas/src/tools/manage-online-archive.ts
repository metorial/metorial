import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let manageOnlineArchiveTool = SlateTool.create(spec, {
  name: 'Manage Online Archive',
  key: 'manage_online_archive',
  description: `Configure Online Archive rules to automatically move infrequently accessed data from Atlas clusters to cheaper cloud object storage. Archived data remains queryable through federated queries.`,
  instructions: [
    'Online Archive requires dedicated clusters (M10+).',
    'Define criteria to determine which data to archive based on a date field or custom criteria.',
    'Archived data is accessible through Atlas Data Federation.'
  ]
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      clusterName: z.string().describe('Cluster name'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      archiveId: z.string().optional().describe('Online archive ID (for get/update/delete)'),
      databaseName: z.string().optional().describe('Database name (for create)'),
      collectionName: z.string().optional().describe('Collection name (for create)'),
      criteria: z
        .object({
          type: z.enum(['DATE', 'CUSTOM']).describe('Archive criteria type'),
          dateField: z.string().optional().describe('Date field name for DATE criteria'),
          dateFormat: z
            .string()
            .optional()
            .describe('Date format (ISODATE, EPOCH_SECONDS, EPOCH_MILLIS, EPOCH_NANOSECONDS)'),
          expireAfterDays: z
            .number()
            .optional()
            .describe('Number of days after which data is archived'),
          query: z.string().optional().describe('JSON query string for CUSTOM criteria')
        })
        .optional()
        .describe('Criteria for determining which documents to archive'),
      partitionFields: z
        .array(
          z.object({
            fieldName: z.string().describe('Field name to partition by'),
            order: z.number().describe('Partition order (0 for first, 1 for second, etc.)')
          })
        )
        .optional()
        .describe('Fields to partition archived data by for efficient querying'),
      paused: z.boolean().optional().describe('Pause or resume the online archive')
    })
  )
  .output(
    z.object({
      archive: z.any().optional(),
      archives: z.array(z.any()).optional(),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('projectId is required. Provide it in input or config.');

    let { action, clusterName } = ctx.input;

    if (action === 'list') {
      let result = await client.listOnlineArchives(projectId, clusterName);
      let archives = result.results || [];
      return {
        output: { archives, totalCount: result.totalCount || archives.length },
        message: `Found **${archives.length}** online archive(s) for cluster **${clusterName}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.archiveId) throw new Error('archiveId is required.');
      let archive = await client.getOnlineArchive(projectId, clusterName, ctx.input.archiveId);
      return {
        output: { archive },
        message: `Retrieved online archive **${ctx.input.archiveId}** (state: ${archive.state}).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.databaseName || !ctx.input.collectionName) {
        throw new Error(
          'databaseName and collectionName are required for creating an online archive.'
        );
      }
      if (!ctx.input.criteria)
        throw new Error('criteria is required for creating an online archive.');

      let data: any = {
        dbName: ctx.input.databaseName,
        collName: ctx.input.collectionName,
        criteria: ctx.input.criteria
      };
      if (ctx.input.partitionFields) data.partitionFields = ctx.input.partitionFields;

      let archive = await client.createOnlineArchive(projectId, clusterName, data);
      return {
        output: { archive },
        message: `Created online archive for **${ctx.input.databaseName}.${ctx.input.collectionName}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.archiveId) throw new Error('archiveId is required.');
      let data: any = {};
      if (ctx.input.criteria) data.criteria = ctx.input.criteria;
      if (ctx.input.paused !== undefined) data.paused = ctx.input.paused;

      let archive = await client.updateOnlineArchive(
        projectId,
        clusterName,
        ctx.input.archiveId,
        data
      );
      return {
        output: { archive },
        message: `Updated online archive **${ctx.input.archiveId}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.archiveId) throw new Error('archiveId is required.');
      await client.deleteOnlineArchive(projectId, clusterName, ctx.input.archiveId);
      return {
        output: {},
        message: `Deleted online archive **${ctx.input.archiveId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
