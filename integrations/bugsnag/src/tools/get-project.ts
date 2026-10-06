import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { spec } from '../spec';

export let getProject = SlateTool.create(spec, {
  name: 'Get Project',
  key: 'get_project',
  description: `Get detailed information about a specific Bugsnag project including its configuration, release stages, stability targets, and error counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z.string().describe('The project ID to retrieve')
    })
  )
  .output(
    z.object({
      projectId: z.string().describe('Unique identifier of the project'),
      name: z.string().describe('Name of the project'),
      slug: z.string().optional().describe('URL-friendly slug'),
      type: z.string().optional().describe('Project platform type'),
      apiKey: z.string().optional().describe('Project API key used by SDKs'),
      releaseStages: z.array(z.string()).optional().describe('Configured release stages'),
      language: z.string().optional().describe('Primary programming language'),
      createdAt: z.string().optional().describe('ISO 8601 timestamp when created'),
      updatedAt: z.string().optional().describe('ISO 8601 timestamp when last updated'),
      openErrorCount: z.number().optional().describe('Number of open errors'),
      forReview: z.number().optional().describe('Number of errors for review'),
      collaboratorsCount: z.number().optional().describe('Number of collaborators'),
      globalGrouping: z.array(z.string()).optional().describe('Global grouping rules'),
      locationGrouping: z.array(z.string()).optional().describe('Location grouping rules'),
      discardedAppVersions: z.array(z.string()).optional().describe('Discarded app versions'),
      discardedErrors: z.array(z.string()).optional().describe('Discarded error classes'),
      url: z.string().optional().describe('API URL for this project'),
      htmlUrl: z.string().optional().describe('Dashboard URL for this project'),
      errorsUrl: z.string().optional().describe('API URL for project errors'),
      eventsUrl: z.string().optional().describe('API URL for project events')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    let p = await client.getProject(projectId);

    let output = {
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
      forReview: p.for_review_error_count ?? undefined,
      collaboratorsCount: p.collaborators_count ?? undefined,
      globalGrouping: p.global_grouping ?? undefined,
      locationGrouping: p.location_grouping ?? undefined,
      discardedAppVersions: p.discarded_app_versions ?? undefined,
      discardedErrors: p.discarded_errors ?? undefined,
      url: p.url ?? undefined,
      htmlUrl: p.html_url ?? undefined,
      errorsUrl: p.errors_url ?? undefined,
      eventsUrl: p.events_url ?? undefined
    };

    return {
      output,
      message: `Project **${p.name}** (${p.type || 'unknown type'}) with ${p.open_error_count ?? 0} open errors.`
    };
  })
  .build();
