import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { pageInput, pageOutput } from '../lib/schemas';
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
      ...pageInput,
      organizationId: z.string().describe('Organization ID to list projects for'),
      perPage: z
        .number()
        .optional()
        .describe('Number of results per page (max 100, default 30)')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      projects: z.array(projectSchema).describe('List of projects')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let orgId = ctx.input.organizationId || ctx.config.organizationId;
    if (!orgId)
      throw createApiServiceError(
        'Organization ID is required. Provide it in the input or set it in the config.'
      );

    let projects = await client.listProjects(orgId, {
      perPage: ctx.input.perPage,
      pageUrl: ctx.input.pageUrl
    });

    let mapped = projects.map(p => ({
      projectId: p.id ?? undefined,
      name: p.name ?? undefined,
      slug: p.slug ?? undefined,
      type: p.type ?? undefined,
      apiKey: p.api_key ?? undefined,
      releaseStages: p.release_stages ?? undefined,
      language: p.language ?? undefined,
      createdAt: p.created_at ?? undefined,
      updatedAt: p.updated_at ?? undefined,
      openErrorCount: p.open_error_count ?? undefined,
      url: p.url ?? undefined,
      htmlUrl: p.html_url ?? undefined
    }));

    return {
      output: { projects: mapped, ...client.pageInfo },
      message: `Found **${mapped.length}** project(s) in the organization.`
    };
  })
  .build();
