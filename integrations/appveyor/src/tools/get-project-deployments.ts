import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

export let getProjectDeployments = SlateTool.create(spec, {
  name: 'Get Project Deployments',
  key: 'get_project_deployments',
  description:
    'Read deployment history for a project, including deployment IDs, environments, build versions, and status. Call list_projects to discover the account name and project slug. Use startDeploymentId to page through older deployments.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      accountName: z
        .string()
        .describe('Account name. Call list_projects to discover accounts and projects.'),
      projectSlug: z.string().describe('Project slug returned by list_projects.'),
      recordsNumber: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Number of deployments per page, from 1 to 20; defaults to 20.'),
      startDeploymentId: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Deployment ID to start from when requesting an older page.')
    })
  )
  .output(
    z.object({
      project: z.record(z.string(), z.unknown()).describe('Project metadata.'),
      deployments: z
        .array(z.record(z.string(), z.unknown()))
        .describe('Deployment records with their build and environment metadata.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.auth.accountName ?? (ctx.config as { accountName?: string }).accountName
    });
    let result = await client.getProjectDeployments(
      ctx.input.accountName,
      ctx.input.projectSlug,
      {
        recordsNumber: ctx.input.recordsNumber ?? 20,
        startDeploymentId: ctx.input.startDeploymentId
      }
    );
    return {
      output: { project: result.project ?? {}, deployments: result.deployments ?? [] },
      message: `Retrieved deployment history for **${ctx.input.accountName}/${ctx.input.projectSlug}**.`
    };
  })
  .build();
