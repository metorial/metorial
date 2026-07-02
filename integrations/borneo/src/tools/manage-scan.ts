import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageScan = SlateTool.create(spec, {
  name: 'Manage Scan',
  key: 'manage_scan',
  description: `Retrieve scan details, list scans, or control scan execution (pause, resume, stop). Use this to monitor and manage ongoing or completed data discovery scans.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'pause', 'resume', 'stop'])
        .describe('Action to perform on the scan'),
      scanId: z
        .string()
        .optional()
        .describe('Scan ID (required for get, pause, resume, stop)'),
      page: z.number().optional().describe('Page number for listing'),
      size: z.number().optional().describe('Page size for listing'),
      sortBy: z.string().optional().describe('Field to sort by'),
      sortOrder: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
      status: z.string().optional().describe('Filter by scan status')
    })
  )
  .output(
    z
      .object({
        scan: z.any().optional().describe('Scan details (for get action)'),
        scans: z.array(z.any()).optional().describe('List of scans (for list action)'),
        success: z.boolean().optional().describe('Whether the action succeeded')
      })
      .passthrough()
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl
    });

    let { action, scanId } = ctx.input;

    if (action !== 'list' && !scanId) {
      throw new Error('scanId is required for get, pause, resume, and stop actions');
    }

    switch (action) {
      case 'get': {
        let result = await client.getScanById(scanId!);
        let data = result?.data ?? result;
        return {
          output: { scan: data, success: true },
          message: `Retrieved scan **${scanId}**. Status: **${data?.status ?? 'unknown'}**.`
        };
      }
      case 'list': {
        let result = await client.listScans({
          page: ctx.input.page,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder,
          status: ctx.input.status
        });
        let data = result?.data ?? result;
        let scans = Array.isArray(data) ? data : (data?.content ?? data?.items ?? []);
        return {
          output: { scans, success: true },
          message: `Found **${scans.length}** scan(s).`
        };
      }
      case 'pause': {
        await client.pauseScan(scanId!);
        return {
          output: { success: true },
          message: `Scan **${scanId}** paused.`
        };
      }
      case 'resume': {
        await client.resumeScan(scanId!);
        return {
          output: { success: true },
          message: `Scan **${scanId}** resumed.`
        };
      }
      case 'stop': {
        await client.stopScan(scanId!);
        return {
          output: { success: true },
          message: `Scan **${scanId}** stopped.`
        };
      }
    }
  })
  .build();
