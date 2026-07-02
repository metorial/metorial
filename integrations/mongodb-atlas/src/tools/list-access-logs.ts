import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { requireString, resolveProjectId } from '../lib/validation';
import { spec } from '../spec';

export let listAccessLogsTool = SlateTool.create(spec, {
  name: 'List Access Logs',
  key: 'list_access_logs',
  description: `Return MongoDB Atlas database access history for one cluster. Use this for security review, troubleshooting failed authentications, and investigating recent database connection activity.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      projectId: z
        .string()
        .optional()
        .describe('Atlas Project ID. Uses config projectId if not provided.'),
      clusterName: z
        .string()
        .describe('Cluster name to retrieve database access history for.'),
      start: z
        .string()
        .optional()
        .describe('ISO 8601 start time for the access history window.'),
      end: z.string().optional().describe('ISO 8601 end time for the access history window.'),
      nLogs: z.number().optional().describe('Maximum number of log entries to return.'),
      authResult: z
        .boolean()
        .optional()
        .describe('Filter by authentication success or failure.'),
      ipAddress: z.string().optional().describe('Filter by source IP address.')
    })
  )
  .output(
    z.object({
      accessLogs: z.array(z.any()),
      totalCount: z.number().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth);
    let projectId = resolveProjectId(ctx.input.projectId, ctx.config.projectId);
    let clusterName = requireString(ctx.input.clusterName, 'clusterName');
    let result = await client.listAccessLogs(projectId, clusterName, {
      start: ctx.input.start,
      end: ctx.input.end,
      nLogs: ctx.input.nLogs,
      authResult: ctx.input.authResult,
      ipAddress: ctx.input.ipAddress
    });
    let accessLogs = result.results || [];

    return {
      output: { accessLogs, totalCount: result.totalCount || accessLogs.length },
      message: `Found **${accessLogs.length}** database access log entr${
        accessLogs.length === 1 ? 'y' : 'ies'
      } for cluster **${clusterName}**.`
    };
  })
  .build();
