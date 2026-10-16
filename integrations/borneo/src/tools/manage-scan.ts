import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { listMetadata, readList } from '../lib/responses';
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
      organisationId: z
        .number()
        .optional()
        .describe('Organisation ID from get_current_user. Omit to use the token default.'),
      action: z
        .enum(['get', 'list', 'pause', 'resume', 'stop'])
        .describe('Action to perform on the scan'),
      scanId: z
        .string()
        .optional()
        .describe('Scan ID (required for get, pause, resume, stop)'),
      nextToken: z
        .string()
        .optional()
        .describe(
          'Continuation token returned by the previous list response. Omit page when using this token.'
        ),
      page: z
        .number()
        .optional()
        .describe(
          'Zero-based page number. Later pages follow provider continuation tokens; prefer nextToken for efficient paging.'
        ),
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
      baseUrl: ctx.auth.baseUrl ?? ctx.config.baseUrl,
      organisationId: ctx.input.organisationId
    });

    let { action, scanId } = ctx.input;

    if (action !== 'list' && !scanId) {
      throw createApiServiceError(
        'scanId is required for get, pause, resume, and stop actions'
      );
    }

    switch (action) {
      case 'get': {
        let result = await client.getScanById(scanId!);
        let data = result;
        return {
          output: { scan: data, success: true },
          message: `Retrieved scan **${scanId}**.`
        };
      }
      case 'list': {
        let result = await client.listScans({
          page: ctx.input.page,
          nextToken: ctx.input.nextToken,
          size: ctx.input.size,
          sortBy: ctx.input.sortBy,
          sortOrder: ctx.input.sortOrder,
          status: ctx.input.status
        });
        let data = result;
        let scans = readList(data, 'scans');
        return {
          output: { scans, success: true, ...listMetadata(data) },
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
