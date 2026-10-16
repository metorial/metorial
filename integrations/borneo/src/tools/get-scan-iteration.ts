import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getScanIteration = SlateTool.create(spec, {
  name: 'Get Scan Iteration',
  key: 'get_scan_iteration',
  description: `Retrieve detailed information about a specific scan iteration, including its status, results, and metadata. Useful for tracking individual scan executions within a scheduled scan.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      scanIterationId: z.string().describe('ID of the scan iteration to retrieve')
    })
  )
  .output(
    z
      .object({
        iterationId: z.string().optional().describe('ID of the scan iteration'),
        scanId: z.string().optional().describe('Parent scan ID'),
        status: z.string().optional().describe('Current status of the iteration'),
        startedAt: z.string().optional().describe('When the iteration started'),
        completedAt: z.string().optional().describe('When the iteration completed')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let result = await client.getScanIteration(ctx.input.scanIterationId);
    let data = result;

    return {
      output: {
        iterationId: data.scanIterationId,
        scanId: data?.scanId,
        status: data?.status,
        startedAt: data?.startedAt,
        completedAt: data?.completedAt,
        ...data
      },
      message: `Retrieved scan iteration **${ctx.input.scanIterationId}**.`
    };
  })
  .build();
