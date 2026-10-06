import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { orgIdInput } from '../lib/deployment';
import { analyticsFields } from '../lib/schemas';
import { spec } from '../spec';

export let getProjectAnalytics = SlateTool.create(spec, {
  name: 'Get Project Analytics',
  key: 'get_project_analytics',
  description: `Retrieve run logs and analytics for a specific flow/project. Returns detailed information about each run including status, latency, token usage, inputs, outputs, and errors. Supports date range filtering and pagination.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      flowId: z.string().min(1).describe('The flow/project ID to get analytics for'),
      orgId: orgIdInput,
      ...analyticsFields,
      userId: z.string().min(1).optional().describe('Filter runs by user ID'),
      states: z
        .array(z.enum(['PENDING', 'PAUSED', 'RESUMED', 'COMPLETED', 'FAILED', 'CANCELLED']))
        .min(1)
        .optional()
        .describe('Filter runs by one or more execution states')
    })
  )
  .output(
    z.object({
      runs: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'List of run log entries with run_id, date, status, latency, token counts, inputs, outputs, etc.'
        )
    })
  )
  .handleInvocation(async ctx => {
    validateDateRange(ctx.input);
    let client = createClient(ctx, ctx.input.orgId);

    let runs = await client.getProjectAnalytics(ctx.input.flowId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate,
      userId: ctx.input.userId,
      states: ctx.input.states
    });

    return {
      output: {
        runs
      },
      message: `Retrieved **${runs.length}** run log(s) for flow **${ctx.input.flowId}**.`
    };
  })
  .build();

export let getOrganizationAnalytics = SlateTool.create(spec, {
  name: 'Get Organization Analytics',
  key: 'get_organization_analytics',
  description: `Retrieve analytics summary across all projects in the organization. Returns per-project summaries including total runs, errors, token usage, and user counts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...analyticsFields
    })
  )
  .output(
    z.object({
      projects: z
        .array(z.record(z.string(), z.unknown()))
        .describe(
          'List of project run summaries with total runs, errors, tokens, users per project'
        )
    })
  )
  .handleInvocation(async ctx => {
    validateDateRange(ctx.input);
    let client = createClient(ctx);

    let projects = await client.getOrganizationAnalytics({
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
    });

    return {
      output: {
        projects
      },
      message: `Retrieved analytics for **${projects.length}** project(s).`
    };
  })
  .build();

export let getStorageAnalytics = SlateTool.create(spec, {
  name: 'Get Storage Analytics',
  key: 'get_storage_analytics',
  description: `Retrieve storage usage analytics for the organization, including total storage and per-knowledge-base breakdowns.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      totalStorageBytes: z.number().optional().describe('Total storage usage in bytes'),
      knowledgeBases: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Per-knowledge-base storage usage details')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let usage = await client.getStorageUsage();
    let totalBytes = usage.total_storage_bytes;
    let kbs = usage.knowledge_bases;

    return {
      output: {
        totalStorageBytes: totalBytes,
        knowledgeBases: kbs
      },
      message: `Storage usage: **${totalBytes !== undefined ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB` : 'unknown'}** total.`
    };
  })
  .build();

const validateDateRange = (input: { startDate?: string; endDate?: string }) => {
  if (
    input.startDate &&
    input.endDate &&
    Date.parse(input.startDate) > Date.parse(input.endDate)
  ) {
    throw createApiServiceError('startDate must be before or equal to endDate.');
  }
};
