import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeployRequest = SlateTool.create(spec, {
  name: 'Create Deploy Request',
  key: 'create_deploy_request',
  description: `Create a deploy request to merge schema changes from one branch into another (Vitess only). Similar to a pull request but for database schema changes. Optionally enable auto-cutover and auto-deletion of the source branch.`,
  constraints: [
    'Deploy requests are only available for Vitess (MySQL) databases.',
    'The source branch must have schema changes relative to the target branch.'
  ]
})
  .input(
    z.object({
      databaseName: z.string().describe('Name of the database'),
      branch: z.string().describe('Source branch with schema changes'),
      intoBranch: z.string().describe('Target branch to merge into (typically production)'),
      notes: z.string().optional().describe('Notes or description for the deploy request'),
      autoCutover: z.boolean().optional().describe('Automatically apply changes when ready'),
      autoDeleteBranch: z
        .boolean()
        .optional()
        .describe('Automatically delete source branch after deployment')
    })
  )
  .output(
    z.object({
      deployRequestId: z.string(),
      number: z.number(),
      branch: z.string().optional(),
      intoBranch: z.string().optional(),
      state: z.string().optional(),
      approved: z.boolean().optional(),
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

    let dr = await client.createDeployRequest(ctx.input.databaseName, {
      branch: ctx.input.branch,
      intoBranch: ctx.input.intoBranch,
      notes: ctx.input.notes,
      autoCutover: ctx.input.autoCutover,
      autoDeleteBranch: ctx.input.autoDeleteBranch
    });

    return {
      output: {
        deployRequestId: dr.id,
        number: dr.number,
        branch: dr.branch,
        intoBranch: dr.into_branch,
        state: dr.state,
        approved: dr.approved,
        createdAt: dr.created_at,
        htmlUrl: dr.html_url
      },
      message: `Created deploy request **#${dr.number}** to merge **${ctx.input.branch}** into **${ctx.input.intoBranch}**.`
    };
  });
