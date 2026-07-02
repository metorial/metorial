import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getDatabase = SlateTool.create(spec, {
  name: 'Get Database',
  key: 'get_database',
  description: `Retrieve detailed information about a specific PlanetScale database, including its state, region, branch counts, schema settings, and configuration.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database to retrieve')
    })
  )
  .output(
    z.object({
      databaseId: z.string(),
      name: z.string(),
      state: z.string(),
      kind: z.string(),
      region: z.string().optional(),
      regionSlug: z.string().optional(),
      branchesCount: z.number().optional(),
      productionBranchesCount: z.number().optional(),
      developmentBranchesCount: z.number().optional(),
      defaultBranch: z.string().optional(),
      plan: z.string().optional(),
      sharded: z.boolean().optional(),
      ready: z.boolean().optional(),
      requireApprovalForDeploy: z.boolean().optional(),
      foreignKeysEnabled: z.boolean().optional(),
      allowDataBranching: z.boolean().optional(),
      insightsEnabled: z.boolean().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      url: z.string().optional(),
      htmlUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let db = await client.getDatabase(ctx.input.databaseName);

    return {
      output: {
        databaseId: db.id,
        name: db.name,
        state: db.state,
        kind: db.kind || 'mysql',
        region: db.region?.display_name || db.region?.slug,
        regionSlug: db.region?.slug,
        branchesCount: db.branches_count,
        productionBranchesCount: db.production_branches_count,
        developmentBranchesCount: db.development_branches_count,
        defaultBranch: db.default_branch,
        plan: db.plan,
        sharded: db.sharded,
        ready: db.ready,
        requireApprovalForDeploy: db.require_approval_for_deploy,
        foreignKeysEnabled: db.foreign_keys_enabled,
        allowDataBranching: db.allow_data_branching,
        insightsEnabled: db.insights_enabled,
        createdAt: db.created_at,
        updatedAt: db.updated_at,
        url: db.url,
        htmlUrl: db.html_url
      },
      message: `Database **${db.name}** is in **${db.state}** state (${db.kind || 'mysql'}) in region ${db.region?.display_name || 'unknown'}.`
    };
  });
