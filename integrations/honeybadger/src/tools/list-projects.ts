import { SlateTool } from 'slates';
import { z } from 'zod';
import { HoneybadgerClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.number().describe('Unique project ID'),
  name: z.string().describe('Project name'),
  projectToken: z.string().optional().describe('Project API key for reporting'),
  faultCount: z.number().optional().describe('Total number of faults'),
  language: z.string().optional().describe('Primary language of the project'),
  createdAt: z.string().optional().describe('When the project was created'),
  environments: z.array(z.any()).optional().describe('Project environments'),
  teams: z.array(z.any()).optional().describe('Teams associated with the project'),
  active: z.boolean().optional().describe('Whether the project is active')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all Honeybadger projects accessible with your auth token. Optionally filter by account. Returns project details including name, language, fault count, and associated teams.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      accountId: z.string().optional().describe('Filter projects by account ID')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new HoneybadgerClient({ token: ctx.auth.token });
    let data = await client.listProjects({ accountId: ctx.input.accountId });
    let results = data.results || [];

    let projects = results.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      projectToken: p.token,
      faultCount: p.fault_count,
      language: p.language,
      createdAt: p.created_at,
      environments: p.environments,
      teams: p.teams,
      active: p.active
    }));

    return {
      output: { projects },
      message: `Found **${projects.length}** project(s).`
    };
  })
  .build();
