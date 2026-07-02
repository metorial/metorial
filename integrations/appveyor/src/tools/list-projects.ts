import { SlateTool } from 'slates';
import { z } from 'zod';
import { AppVeyorClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Unique project identifier'),
  accountId: z.number().describe('Account identifier'),
  accountName: z.string().describe('Account name'),
  name: z.string().describe('Project name'),
  slug: z.string().describe('Project URL slug'),
  repositoryType: z.string().describe('Repository type (e.g. gitHub, bitBucket)'),
  repositoryScm: z.string().optional().describe('Source control type'),
  repositoryName: z.string().describe('Repository full name'),
  repositoryBranch: z.string().optional().describe('Default branch'),
  isPrivate: z.boolean().optional().describe('Whether the project is private'),
  created: z.string().describe('Creation timestamp')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all CI/CD projects in the AppVeyor account. Returns project metadata including repository information, account details, and creation timestamps.`,
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
    let client = new AppVeyorClient({
      token: ctx.auth.token,
      accountName: ctx.config.accountName
    });

    let projects = await client.listProjects();

    let mapped = projects.map((p: any) => ({
      projectId: p.projectId,
      accountId: p.accountId,
      accountName: p.accountName,
      name: p.name,
      slug: p.slug,
      repositoryType: p.repositoryType,
      repositoryScm: p.repositoryScm,
      repositoryName: p.repositoryName,
      repositoryBranch: p.repositoryBranch,
      isPrivate: p.isPrivate,
      created: p.created
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s).`
    };
  })
  .build();
