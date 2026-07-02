import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createDeploymentTool = SlateTool.create(spec, {
  name: 'Create Deployment',
  key: 'create_deployment',
  description: `Trigger a new deployment for a Vercel project. Deploy from a Git source, redeploy an existing deployment, or deploy files directly. Specify the target environment (production, preview, or custom).`,
  instructions: [
    'For Git-based deployments, provide the gitSource with the ref (branch) and optionally sha.',
    'To redeploy, provide the redeploymentId of an existing deployment.',
    'The project field should be set to the project ID or name.'
  ]
})
  .input(
    z.object({
      name: z.string().describe('Project name (used in deployment URL)'),
      project: z
        .string()
        .optional()
        .describe('Project ID (overrides name for project targeting)'),
      target: z
        .enum(['production', 'preview'])
        .optional()
        .describe('Deployment target environment'),
      redeploymentId: z.string().optional().describe('Existing deployment ID to redeploy'),
      gitSource: z
        .object({
          type: z.enum(['github', 'gitlab', 'bitbucket']).describe('Git provider'),
          ref: z.string().describe('Git branch or tag'),
          repoId: z.string().optional().describe('Repository ID'),
          sha: z.string().optional().describe('Specific commit SHA')
        })
        .optional()
        .describe('Git source for the deployment')
    })
  )
  .output(
    z.object({
      deploymentId: z.string().describe('Created deployment ID'),
      url: z.string().optional().describe('Deployment URL'),
      state: z.string().optional().describe('Initial deployment state'),
      target: z.string().optional().nullable().describe('Target environment'),
      projectId: z.string().optional().describe('Associated project ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      teamId: ctx.config.teamId
    });

    let data: any = { name: ctx.input.name };
    if (ctx.input.project) data.project = ctx.input.project;
    if (ctx.input.target) data.target = ctx.input.target;
    if (ctx.input.redeploymentId) data.deploymentId = ctx.input.redeploymentId;
    if (ctx.input.gitSource) data.gitSource = ctx.input.gitSource;

    let d = await client.createDeployment(data);

    return {
      output: {
        deploymentId: d.id,
        url: d.url,
        state: d.readyState || d.status,
        target: d.target || null,
        projectId: d.projectId
      },
      message: `Created deployment **${d.id}** for project "${ctx.input.name}" targeting ${ctx.input.target || 'preview'}.`
    };
  })
  .build();
