import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
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
      flowId: z.string().describe('The flow/project ID to get analytics for'),
      page: z.number().optional().describe('Page number (0-indexed, default 0)'),
      pageSize: z.number().optional().describe('Results per page (default 25)'),
      startDate: z.string().optional().describe('Start date filter (ISO 8601 format)'),
      endDate: z.string().optional().describe('End date filter (ISO 8601 format)')
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
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let runs = await client.getProjectAnalytics(ctx.input.flowId, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize,
      startDate: ctx.input.startDate,
      endDate: ctx.input.endDate
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
      page: z.number().optional().describe('Page number (0-indexed, default 0)'),
      pageSize: z.number().optional().describe('Results per page (default 25)'),
      startDate: z.string().optional().describe('Start date filter (ISO 8601 format)'),
      endDate: z.string().optional().describe('End date filter (ISO 8601 format)')
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
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

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
    let client = new Client({
      token: ctx.auth.token,
      orgId: ctx.config.orgId
    });

    let usage = await client.getStorageUsage();
    let totalBytes = usage.total_storage_bytes as number | undefined;
    let kbs = usage.knowledge_bases as Record<string, unknown>[] | undefined;

    return {
      output: {
        totalStorageBytes: totalBytes,
        knowledgeBases: kbs
      },
      message: `Storage usage: **${totalBytes ? `${(totalBytes / (1024 * 1024)).toFixed(2)} MB` : 'unknown'}** total.`
    };
  })
  .build();
