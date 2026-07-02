import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import {
  failValidation,
  invalidAction,
  requireString,
  resolveProjectId
} from '../lib/validation';
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
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);

    let { action } = ctx.input;
    let clusterName = requireString(ctx.input.clusterName, 'clusterName');

    if (action === 'list') {
      let result = await client.listOnlineArchives(projectId, clusterName);
      let archives = result.results || [];
      return {
        output: { archives, totalCount: result.totalCount || archives.length },
        message: `Found **${archives.length}** online archive(s) for cluster **${clusterName}**.`
      };
    }

    if (action === 'get') {
      let archiveId = requireString(ctx.input.archiveId, 'archiveId');
      let archive = await client.getOnlineArchive(projectId, clusterName, archiveId);
      return {
        output: { archive },
        message: `Retrieved online archive **${archiveId}** (state: ${archive.state}).`
      };
    }

    if (action === 'create') {
      let databaseName = requireString(
        ctx.input.databaseName,
        'databaseName',
        'for creating an online archive'
      );
      let collectionName = requireString(
        ctx.input.collectionName,
        'collectionName',
        'for creating an online archive'
      );
      if (!ctx.input.criteria)
        failValidation('criteria is required for creating an online archive.');

      let data: any = {
        dbName: databaseName,
        collName: collectionName,
        criteria: ctx.input.criteria
      };
      if (ctx.input.partitionFields) data.partitionFields = ctx.input.partitionFields;

      let archive = await client.createOnlineArchive(projectId, clusterName, data);
      return {
        output: { archive },
        message: `Created online archive for **${databaseName}.${collectionName}**.`
      };
    }

    if (action === 'update') {
      let archiveId = requireString(ctx.input.archiveId, 'archiveId');
      let data: any = {};
      if (ctx.input.criteria) data.criteria = ctx.input.criteria;
      if (ctx.input.paused !== undefined) data.paused = ctx.input.paused;

      let archive = await client.updateOnlineArchive(projectId, clusterName, archiveId, data);
      return {
        output: { archive },
        message: `Updated online archive **${archiveId}**.`
      };
    }

    if (action === 'delete') {
      let archiveId = requireString(ctx.input.archiveId, 'archiveId');
      await client.deleteOnlineArchive(projectId, clusterName, archiveId);
      return {
        output: {},
        message: `Deleted online archive **${archiveId}**.`
      };
    }

    return invalidAction(action);
  })
  .build();
