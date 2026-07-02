import { SlateTool } from 'slates';
import { z } from 'zod';
import { BugsnagClient } from '../lib/client';
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
      projectId: z.string().describe('Project ID to list releases for'),
      releaseStage: z
        .string()
        .optional()
        .describe('Filter by release stage (e.g., production, staging)'),
      perPage: z.number().optional().describe('Number of results per page (max 100)')
    })
  )
  .output(
    z.object({
      releases: z.array(releaseSchema).describe('List of releases')
    })
  )
  .handleInvocation(async ctx => {
    let client = new BugsnagClient({ token: ctx.auth.token });
    let projectId = ctx.input.projectId || ctx.config.projectId;
    if (!projectId) throw new Error('Project ID is required.');

    let releases = await client.listReleases(projectId, {
      perPage: ctx.input.perPage,
      releaseStage: ctx.input.releaseStage
    });

    let mapped = releases.map((r: any) => ({
      releaseId: r.id,
      version: r.release_name || r.version || r.app_version,
      versionCode: r.version_code,
      bundleVersion: r.bundle_version,
      releaseStage: r.release_stage,
      releaseSource: r.release_source,
      builderName: r.builder_name,
      buildTool: r.build_tool,
      releaseTime: r.release_time || r.created_at,
      totalSessionsCount: r.total_sessions_count,
      unhandledSessionsCount: r.unhandled_sessions_count,
      sessionStabilityPercentage: r.sessions_count_in_last_24h != null ? undefined : undefined,
      crashFreeSessionsPercentage: r.crash_free_sessions,
      sourceControl: r.source_control
        ? {
            provider: r.source_control.provider,
            repository: r.source_control.repository,
            revision: r.source_control.revision,
            diffUrl: r.source_control.diff_url
          }
        : undefined
    }));

    return {
      output: { releases: mapped },
      message: `Found **${mapped.length}** release(s).`
    };
  })
  .build();
