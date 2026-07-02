import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateDatabase = SlateTool.create(spec, {
  name: 'Update Database',
  key: 'update_database',
  description: `Update settings for a PlanetScale database. Toggle deploy request approval requirements, foreign keys, data branching, and query insights.`
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database to update'),
      requireApprovalForDeploy: z
        .boolean()
        .optional()
        .describe('Require admin approval for deploy requests'),
      foreignKeysEnabled: z.boolean().optional().describe('Enable foreign key constraints'),
      allowDataBranching: z
        .boolean()
        .optional()
        .describe('Allow data branching for development branches'),
      insightsEnabled: z.boolean().optional().describe('Enable query insights')
    })
  )
  .output(
    z.object({
      databaseId: z.string(),
      name: z.string(),
      requireApprovalForDeploy: z.boolean().optional(),
      foreignKeysEnabled: z.boolean().optional(),
      allowDataBranching: z.boolean().optional(),
      insightsEnabled: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let db = await client.updateDatabase(ctx.input.databaseName, {
      requireApprovalForDeploy: ctx.input.requireApprovalForDeploy,
      foreignKeysEnabled: ctx.input.foreignKeysEnabled,
      allowDataBranching: ctx.input.allowDataBranching,
      insightsEnabled: ctx.input.insightsEnabled
    });

    return {
      output: {
        databaseId: db.id,
        name: db.name,
        requireApprovalForDeploy: db.require_approval_for_deploy,
        foreignKeysEnabled: db.foreign_keys_enabled,
        allowDataBranching: db.allow_data_branching,
        insightsEnabled: db.insights_enabled
      },
      message: `Updated settings for database **${db.name}**.`
    };
  });
