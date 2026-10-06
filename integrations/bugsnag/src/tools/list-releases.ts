import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
import { pageInput, pageOutput } from '../lib/schemas';
import { spec } from '../spec';

let releaseSchema = z.object({
  releaseId: z.string().describe('Unique identifier of the release'),
  version: z.string().optional().describe('Release version string'),
  versionCode: z.string().optional().describe('Version code'),
  bundleVersion: z.string().optional().describe('Bundle version'),
  releaseStage: z.string().optional().describe('Release stage (e.g., production, staging)'),
  releaseSource: z.string().optional().describe('How the release was reported'),
  builderName: z.string().optional().describe('Who built the release'),
  buildTool: z.string().optional().describe('Build tool used'),
  releaseTime: z
    .string()
    .optional()
    .describe('ISO 8601 timestamp when the release was created'),
  totalSessionsCount: z.number().optional().describe('Total sessions for this release'),
  unhandledSessionsCount: z.number().optional().describe('Sessions with unhandled errors'),
  sessionStabilityPercentage: z.number().optional().describe('Session stability percentage'),
  crashFreeSessionsPercentage: z
    .number()
    .optional()
    .describe('Crash-free sessions percentage'),
  sourceControl: z
    .object({
      provider: z.string().optional().describe('Source control provider'),
      repository: z.string().optional().describe('Repository URL'),
      revision: z.string().optional().describe('Commit revision'),
      diffUrl: z.string().optional().describe('Diff URL since last release')
    })
    .optional()
    .describe('Source control information')
});

export let listReleases = SlateTool.create(spec, {
  name: 'List Releases',
  key: 'list_releases',
  description: `List releases for a Bugsnag project. Returns release versions, stability scores, session counts, and source control information. Filter by release stage to see production or staging releases.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...pageInput,
      projectId: z.string().describe('Project ID to list releases for'),
      releaseStage: z
        .string()
        .optional()
        .describe('Filter by release stage (e.g., production, staging)'),
      perPage: z.number().optional().describe('Number of releases per page (1–10; default 5)')
    })
  )
  .output(
    z.object({
      ...pageOutput,
      releases: z.array(releaseSchema).describe('List of releases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient(ctx.auth);
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw createApiServiceError('Project ID is required.');

    let releases = await client.listReleases(projectId, {
      perPage: ctx.input.perPage,
      pageUrl: ctx.input.pageUrl,
      releaseStage: ctx.input.releaseStage
    });

    let mapped = releases.map(r => ({
      releaseId: r.id ?? undefined,
      version: r.app_version ?? r.build_label,
      versionCode: r.app_version_code ?? undefined,
      bundleVersion: r.app_bundle_version ?? undefined,
      releaseStage: r.release_stage?.name ?? undefined,
      releaseSource: r.release_source ?? undefined,
      builderName: r.builder_name ?? undefined,
      buildTool: r.build_tool ?? undefined,
      releaseTime: r.release_time ?? undefined,
      totalSessionsCount: r.total_sessions_count ?? undefined,
      unhandledSessionsCount: r.unhandled_sessions_count ?? undefined,
      sessionStabilityPercentage:
        r.total_sessions_count && r.unhandled_sessions_count !== undefined
          ? (1 - r.unhandled_sessions_count / r.total_sessions_count) * 100
          : undefined,
      crashFreeSessionsPercentage:
        r.total_sessions_count && r.unhandled_sessions_count !== undefined
          ? (1 - r.unhandled_sessions_count / r.total_sessions_count) * 100
          : undefined,
      sourceControl: r.source_control
        ? {
            provider: r.source_control.provider ?? undefined,
            repository: r.source_control.repository ?? undefined,
            revision: r.source_control.revision ?? undefined,
            diffUrl: r.source_control.diff_url ?? undefined
          }
        : undefined
    }));

    return {
      output: { releases: mapped, ...client.pageInfo },
      message: `Found **${mapped.length}** release(s).`
    };
  })
  .build();
