import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { requireAtLeastOne } from '../lib/errors';
import { spec } from '../spec';

export let updateDatabase = SlateTool.create(spec, {
  name: 'Update Database',
  key: 'update_database',
  description: `Update settings for a PlanetScale database. Toggle deploy request approval requirements, foreign keys, data branching, and query insights.`
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database to update'),
      newName: z.string().optional().describe('Rename the database to this new name'),
      automaticMigrations: z
        .boolean()
        .optional()
        .describe(
          'Automatically manage Rails migration data during deploy requests (Vitess only)'
        ),
      migrationFramework: z
        .string()
        .optional()
        .describe('Migration framework used for automatic migrations (Vitess only)'),
      migrationTableName: z
        .string()
        .optional()
        .describe('Migration table name used for automatic migrations (Vitess only)'),
      requireApprovalForDeploy: z
        .boolean()
        .optional()
        .describe('Require admin approval for deploy requests'),
      restrictBranchRegion: z
        .boolean()
        .optional()
        .describe('Restrict branch creation to the database region'),
      allowForeignKeyConstraints: z
        .boolean()
        .optional()
        .describe('Allow foreign key constraints (Vitess only)'),
      allowDataBranching: z
        .boolean()
        .optional()
        .describe('Allow data branching for development branches'),
      insightsRawQueries: z
        .boolean()
        .optional()
        .describe('Collect full raw SQL queries for insights'),
      productionBranchWebConsole: z
        .boolean()
        .optional()
        .describe('Allow web console access on production branches'),
      defaultBranch: z.string().optional().describe('Set the database default branch')
    })
  )
  .output(
    z.object({
      databaseId: z.string(),
      name: z.string(),
      defaultBranch: z.string().optional(),
      automaticMigrations: z.boolean().optional(),
      migrationFramework: z.string().optional(),
      migrationTableName: z.string().optional(),
      requireApprovalForDeploy: z.boolean().optional(),
      foreignKeysEnabled: z.boolean().optional(),
      restrictBranchRegion: z.boolean().optional(),
      allowDataBranching: z.boolean().optional(),
      insightsRawQueries: z.boolean().optional(),
      insightsEnabled: z.boolean().optional(),
      productionBranchWebConsole: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    requireAtLeastOne(
      {
        newName: ctx.input.newName,
        automaticMigrations: ctx.input.automaticMigrations,
        migrationFramework: ctx.input.migrationFramework,
        migrationTableName: ctx.input.migrationTableName,
        requireApprovalForDeploy: ctx.input.requireApprovalForDeploy,
        restrictBranchRegion: ctx.input.restrictBranchRegion,
        allowForeignKeyConstraints: ctx.input.allowForeignKeyConstraints,
        allowDataBranching: ctx.input.allowDataBranching,
        insightsRawQueries: ctx.input.insightsRawQueries,
        productionBranchWebConsole: ctx.input.productionBranchWebConsole,
        defaultBranch: ctx.input.defaultBranch
      },
      'Provide at least one PlanetScale database setting to update.'
    );

    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let db = await client.updateDatabase(ctx.input.databaseName, {
      newName: ctx.input.newName,
      automaticMigrations: ctx.input.automaticMigrations,
      migrationFramework: ctx.input.migrationFramework,
      migrationTableName: ctx.input.migrationTableName,
      requireApprovalForDeploy: ctx.input.requireApprovalForDeploy,
      restrictBranchRegion: ctx.input.restrictBranchRegion,
      allowForeignKeyConstraints: ctx.input.allowForeignKeyConstraints,
      allowDataBranching: ctx.input.allowDataBranching,
      insightsRawQueries: ctx.input.insightsRawQueries,
      productionBranchWebConsole: ctx.input.productionBranchWebConsole,
      defaultBranch: ctx.input.defaultBranch
    });

    return {
      output: {
        databaseId: db.id,
        name: db.name,
        defaultBranch: db.default_branch,
        automaticMigrations: db.automatic_migrations,
        migrationFramework: db.migration_framework,
        migrationTableName: db.migration_table_name,
        requireApprovalForDeploy: db.require_approval_for_deploy,
        foreignKeysEnabled: db.foreign_keys_enabled,
        restrictBranchRegion: db.restrict_branch_region,
        allowDataBranching: db.allow_data_branching,
        insightsRawQueries: db.insights_raw_queries,
        insightsEnabled: db.insights_enabled,
        productionBranchWebConsole: db.production_branch_web_console
      },
      message: `Updated settings for database **${db.name}**.`
    };
  });
