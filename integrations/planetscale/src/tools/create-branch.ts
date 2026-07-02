import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { planetscaleServiceError } from '../lib/errors';
import { spec } from '../spec';

export let createBranch = SlateTool.create(spec, {
  name: 'Create Branch',
  key: 'create_branch',
  description: `Create a new branch for a PlanetScale database. Branches are isolated copies of your database schema used for development and testing. Can be created from a parent branch, from a backup, or via point-in-time restore (PostgreSQL only).`,
  instructions: [
    'If no parentBranch is specified, the branch will be created from the database default branch.',
    'Use backupId to restore a branch from an existing backup.',
    'restorePoint is only available for PostgreSQL databases (ISO 8601 timestamp).',
    'Use seedData with value "last_successful_backup" to seed with backup data.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      name: z.string().describe('Name for the new branch'),
      parentBranch: z
        .string()
        .optional()
        .describe('Parent branch to create from (defaults to database default branch)'),
      backupId: z.string().optional().describe('Backup ID to restore from'),
      region: z.string().optional().describe('Region slug for the branch'),
      restorePoint: z
        .string()
        .optional()
        .describe('Point-in-time restore timestamp (PostgreSQL only, ISO 8601)'),
      seedData: z
        .enum(['last_successful_backup'])
        .optional()
        .describe('Seed the branch with data from the last successful backup'),
      clusterSize: z
        .string()
        .optional()
        .describe('Cluster size (required when restoring from backup)'),
      majorVersion: z
        .string()
        .optional()
        .describe('PostgreSQL major version for the new branch'),
      createDatabaseIfMissing: z
        .boolean()
        .optional()
        .describe('Create the database if it does not exist. Requires kind.'),
      kind: z
        .enum(['mysql', 'postgresql'])
        .optional()
        .describe('Branch kind. Required when createDatabaseIfMissing is true.'),
      minimumStorageBytes: z
        .number()
        .optional()
        .describe('Minimum storage size in bytes for branches that support storage bounds'),
      maximumStorageBytes: z
        .number()
        .optional()
        .describe('Maximum storage size in bytes for branches that support storage bounds')
    })
  )
  .output(
    z.object({
      branchId: z.string(),
      name: z.string(),
      state: z.string(),
      kind: z.string(),
      parentBranch: z.string().optional(),
      production: z.boolean().optional(),
      region: z.string().optional(),
      createdAt: z.string().optional(),
      htmlUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.backupId && !ctx.input.clusterSize) {
      throw planetscaleServiceError(
        'clusterSize is required when creating a branch from backupId.'
      );
    }

    if (ctx.input.createDatabaseIfMissing && !ctx.input.kind) {
      throw planetscaleServiceError('kind is required when createDatabaseIfMissing is true.');
    }

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let branch = await client.createBranch(ctx.input.databaseName, {
      name: ctx.input.name,
      parentBranch: ctx.input.parentBranch,
      backupId: ctx.input.backupId,
      region: ctx.input.region,
      restorePoint: ctx.input.restorePoint,
      seedData: ctx.input.seedData,
      clusterSize: ctx.input.clusterSize,
      majorVersion: ctx.input.majorVersion,
      createDatabaseIfMissing: ctx.input.createDatabaseIfMissing,
      kind: ctx.input.kind,
      storage: {
        minimumStorageBytes: ctx.input.minimumStorageBytes,
        maximumStorageBytes: ctx.input.maximumStorageBytes
      }
    });

    return {
      output: {
        branchId: branch.id,
        name: branch.name,
        state: branch.state,
        kind: branch.kind || 'mysql',
        parentBranch: branch.parent_branch,
        production: branch.production,
        region: branch.region?.display_name || branch.region?.slug,
        createdAt: branch.created_at,
        htmlUrl: branch.html_url
      },
      message: `Created branch **${branch.name}** on database **${ctx.input.databaseName}**${ctx.input.parentBranch ? ` from parent branch **${ctx.input.parentBranch}**` : ''}.`
    };
  });
