import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let repositorySchema = z
  .object({
    scmType: z
      .string()
      .optional()
      .describe('Version control system type (e.g., git, svn, mercurial)'),
    url: z.string().optional().describe('Repository URL'),
    branch: z.string().optional().describe('Default branch name')
  })
  .nullable()
  .optional();

let projectSchema = z.object({
  name: z.string().describe('Project name'),
  permalink: z.string().describe('URL-friendly project identifier (slug)'),
  zone: z.string().optional().describe('Deployment region'),
  lastDeployedAt: z.string().nullable().optional().describe('Timestamp of last deployment'),
  autoDeployUrl: z.string().optional().describe('Webhook URL for automatic deployments'),
  repository: repositorySchema.describe('Repository configuration')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in your DeployHQ account. Returns project names, permalinks, repository details, and deployment information.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      email: ctx.auth.email,
      accountName: ctx.config.accountName
    });

    let projects = await client.listProjects();

    let mapped = projects.map((p: any) => ({
      name: p.name,
      permalink: p.permalink,
      zone: p.zone,
      lastDeployedAt: p.last_deployed_at ?? null,
      autoDeployUrl: p.auto_deploy_url,
      repository: p.repository
        ? {
            scmType: p.repository.scm_type,
            url: p.repository.url,
            branch: p.repository.branch
          }
        : null
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
