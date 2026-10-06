import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { legacyBaseUrl, pagination, requireInput, TravisCIClient } from '../lib/client';
import type { Cron } from '../lib/types';
import { spec } from '../spec';

export let manageCrons = SlateTool.create(spec, {
  name: 'Manage Cron Jobs',
  key: 'manage_crons',
  description: `List, create, get, or delete scheduled cron builds for a repository. Crons can run daily, weekly, or monthly on a specific branch. Only one cron job is allowed per branch.`,
  tags: { destructive: true },
  instructions: [
    'Creating a cron replaces any existing schedule on that branch. List the repository crons before creating one.'
  ],
  constraints: ['There can be only one cron per branch on a repository.']
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'get', 'delete']).describe('Action to perform.'),
      repoSlugOrId: z
        .string()
        .optional()
        .describe(
          'Repository slug (e.g. "owner/repo") or numeric ID. Required for list and create.'
        ),
      cronId: z.string().optional().describe('Cron job ID. Required for get and delete.'),
      branchName: z.string().optional().describe('Branch name. Required for create.'),
      interval: z
        .enum(['daily', 'weekly', 'monthly'])
        .optional()
        .describe('Cron schedule interval. Required for create.'),
      limit: z.number().optional().describe('Maximum crons to return for list.'),
      offset: z.number().optional().describe('List pagination offset.'),
      dontRunIfRecentBuildExists: z
        .boolean()
        .optional()
        .describe('Skip the cron run if there was a recent build. Defaults to false.')
    })
  )
  .output(
    z.object({
      hasMore: z.boolean().optional().describe('Whether another page is available'),
      nextOffset: z.number().optional().describe('Offset for the next page'),
      totalCount: z.number().optional().describe('Total cron count'),
      crons: z
        .array(
          z.object({
            cronId: z.number().describe('Cron ID'),
            branchName: z.string().optional().describe('Branch name'),
            interval: z.string().describe('Schedule interval'),
            dontRunIfRecentBuildExists: z
              .boolean()
              .describe('Whether to skip if recent build exists'),
            lastRun: z.string().nullable().optional().describe('Last run timestamp'),
            nextRun: z.string().nullable().optional().describe('Next scheduled run timestamp'),
            active: z.boolean().optional().describe('Whether the cron is active'),
            createdAt: z.string().optional().describe('Creation timestamp')
          })
        )
        .optional()
        .describe('List of cron jobs'),
      cron: z
        .object({
          cronId: z.number().describe('Cron ID'),
          branchName: z.string().optional().describe('Branch name'),
          interval: z.string().describe('Schedule interval'),
          dontRunIfRecentBuildExists: z
            .boolean()
            .describe('Whether to skip if recent build exists'),
          lastRun: z.string().nullable().optional().describe('Last run timestamp'),
          nextRun: z.string().nullable().optional().describe('Next scheduled run timestamp'),
          active: z.boolean().optional().describe('Whether the cron is active'),
          createdAt: z.string().optional().describe('Creation timestamp')
        })
        .optional()
        .describe('Cron job details'),
      deleted: z.boolean().optional().describe('Whether the cron was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TravisCIClient({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? legacyBaseUrl(ctx.config)
    });

    let mapCron = (cron: Cron) => ({
      cronId: cron.id,
      branchName: cron.branch?.name,
      interval: cron.interval,
      dontRunIfRecentBuildExists: cron.dont_run_if_recent_build_exists,
      lastRun: cron.last_run ?? null,
      nextRun: cron.next_run ?? null,
      active: cron.active,
      createdAt: cron.created_at
    });

    switch (ctx.input.action) {
      case 'list': {
        let result = await client.listCrons(
          requireInput(ctx.input.repoSlugOrId, 'repoSlugOrId'),
          { limit: ctx.input.limit, offset: ctx.input.offset }
        );
        let crons = (result.crons || []).map(mapCron);
        return {
          output: { crons, ...pagination(result) },
          message: `Found **${crons.length}** cron jobs for **${ctx.input.repoSlugOrId}**.`
        };
      }

      case 'create': {
        if (!ctx.input.interval)
          throw createApiServiceError('interval is required for create.');
        let result = await client.createCron(
          requireInput(ctx.input.repoSlugOrId, 'repoSlugOrId'),
          requireInput(ctx.input.branchName, 'branchName'),
          {
            interval: ctx.input.interval,
            dontRunIfRecentBuildExists: ctx.input.dontRunIfRecentBuildExists
          }
        );
        return {
          output: { cron: mapCron(result) },
          message: `Created **${ctx.input.interval}** cron on branch **${ctx.input.branchName}** for **${ctx.input.repoSlugOrId}**.`
        };
      }

      case 'get': {
        let result = await client.getCron(requireInput(ctx.input.cronId, 'cronId'));
        return {
          output: { cron: mapCron(result) },
          message: `Retrieved cron job **${result.id}** (${result.interval}, branch: ${result.branch?.name}).`
        };
      }

      case 'delete': {
        await client.deleteCron(requireInput(ctx.input.cronId, 'cronId'));
        return {
          output: { deleted: true },
          message: `Deleted cron job **${ctx.input.cronId}**.`
        };
      }
    }
  })
  .build();
