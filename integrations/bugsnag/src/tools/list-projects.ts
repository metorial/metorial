import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

let projectSchema = z.object({
  projectId: z.string().describe('Unique identifier of the project'),
  name: z.string().describe('Name of the project'),
  slug: z.string().optional().describe('URL-friendly slug for the project'),
  type: z.string().optional().describe('Project platform type (e.g., js, ruby, python)'),
  apiKey: z.string().optional().describe('Project API key used by SDKs'),
  releaseStages: z.array(z.string()).optional().describe('Configured release stages'),
  language: z.string().optional().describe('Primary programming language'),
  createdAt: z.string().optional().describe('ISO 8601 timestamp when the project was created'),
  updatedAt: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the project was last updated'),
  openErrorCount: z.number().optional().describe('Number of open errors'),
  url: z.string().optional().describe('API URL for this project'),
  htmlUrl: z.string().optional().describe('Dashboard URL for this project')
});

export let listProjects = SlateTool.create(spec, {
  name: 'List Projects',
  key: 'list_projects',
  description: `List all projects in a Bugsnag organization. Returns project names, IDs, types, API keys, and configuration. Use this to discover project IDs needed by other tools.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organizationId: z.string().describe('Organization ID to list projects for'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 30)')
    })
  )
  .output(
    z.object({
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId)
      throw new Error(
        'Organization ID is required. Provide it in the input or set it in the config.'
      );

    let projects = await client.listProjects(orgId, {
      perPage: ctx.input.perPage
    });

    let mapped = projects.map((p: any) => ({
      projectId: p.id,
      name: p.name,
      slug: p.slug,
      type: p.type,
      apiKey: p.api_key,
      releaseStages: p.release_stages,
      language: p.language,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      openErrorCount: p.open_error_count,
      url: p.url,
      htmlUrl: p.html_url
    }));

    return {
      output: { projects: mapped },
      message: `Found **${mapped.length}** project(s) in the organization.`
    };
  })
  .build();
