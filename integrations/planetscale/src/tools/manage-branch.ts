import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageBranch = SlateTool.create(spec, {
  name: 'Manage Branch',
  key: 'manage_branch',
  description: `Perform management actions on a PlanetScale database branch. Supports promoting to production, demoting from production, enabling/disabling safe migrations, retrieving branch schema, running schema lint, and deleting branches.`,
  instructions: [
    'Use action "get" to retrieve detailed branch information.',
    'Use action "promote" to promote a development branch to production.',
    'Use action "demote" to demote a production branch to development.',
    'Use action "enable_safe_migrations" or "disable_safe_migrations" to toggle safe migrations on a production branch.',
    'Use action "schema" to retrieve the branch schema.',
    'Use action "lint" to run schema lint checks.',
    'Use action "delete" to permanently delete a branch.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branchName: z.string().describe('Name of the branch'),
      action: z
        .enum([
          'get',
          'promote',
          'demote',
          'enable_safe_migrations',
          'disable_safe_migrations',
          'schema',
          'lint',
          'delete'
        ])
        .describe('Action to perform on the branch')
    })
  )
  .output(
    z.object({
      branchId: z.string().optional(),
      name: z.string().optional(),
      state: z.string().optional(),
      kind: z.string().optional(),
      production: z.boolean().optional(),
      ready: z.boolean().optional(),
      safeMigrations: z.boolean().optional(),
      sharded: z.boolean().optional(),
      parentBranch: z.string().optional(),
      region: z.string().optional(),
      mysqlAddress: z.string().optional(),
      schema: z.any().optional(),
      lintErrors: z.any().optional(),
      deleted: z.boolean().optional(),
      createdAt: z.string().optional(),
      htmlUrl: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authType: ctx.auth.authType,
      organization: ctx.config.organization
    });

    let { databaseName, branchName, action } = ctx.input;

    if (action === 'delete') {
      await client.deleteBranch(databaseName, branchName);
      return {
        output: { deleted: true, name: branchName },
        message: `Deleted branch **${branchName}** from database **${databaseName}**.`
      };
    }

    if (action === 'schema') {
      let schema = await client.getBranchSchema(databaseName, branchName);
      return {
        output: { name: branchName, schema },
        message: `Retrieved schema for branch **${branchName}**.`
      };
    }

    if (action === 'lint') {
      let lintResult = await client.lintBranchSchema(databaseName, branchName);
      return {
        output: { name: branchName, lintErrors: lintResult },
        message: `Ran schema lint on branch **${branchName}**.`
      };
    }

    let branch: any;
    switch (action) {
      case 'get':
        branch = await client.getBranch(databaseName, branchName);
        break;
      case 'promote':
        branch = await client.promoteBranch(databaseName, branchName);
        break;
      case 'demote':
        branch = await client.demoteBranch(databaseName, branchName);
        break;
      case 'enable_safe_migrations':
        branch = await client.enableSafeMigrations(databaseName, branchName);
        break;
      case 'disable_safe_migrations':
        branch = await client.disableSafeMigrations(databaseName, branchName);
        break;
    }

    let actionLabels: Record<string, string> = {
      get: 'Retrieved',
      promote: 'Promoted',
      demote: 'Demoted',
      enable_safe_migrations: 'Enabled safe migrations for',
      disable_safe_migrations: 'Disabled safe migrations for'
    };

    return {
      output: {
        branchId: branch.id,
        name: branch.name,
        state: branch.state,
        kind: branch.kind || 'mysql',
        production: branch.production,
        ready: branch.ready,
        safeMigrations: branch.safe_migrations,
        sharded: branch.sharded,
        parentBranch: branch.parent_branch,
        region: branch.region?.display_name || branch.region?.slug,
        mysqlAddress: branch.mysql_address,
        createdAt: branch.created_at,
        htmlUrl: branch.html_url
      },
      message: `${actionLabels[action]} branch **${branch.name}** on database **${databaseName}**.`
    };
  });
