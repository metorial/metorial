import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let scanCompleted = SlateTrigger.create(spec, {
  name: 'Scan Iteration Completed',
  key: 'scan_completed',
  description:
    'Triggers when a scan iteration completes, fails, or changes status. Polls for new scan iteration results periodically.'
})
  .input(
    z.object({
      iterationId: z.string().describe('Scan iteration ID'),
      scanId: z.string().optional().describe('Parent scan ID'),
      status: z.string().describe('Status of the scan iteration'),
      completedAt: z.string().optional().describe('When the iteration completed'),
      iteration: z.any().describe('Full scan iteration data')
    })
  )
  .output(
    z
      .object({
        iterationId: z.string().describe('ID of the scan iteration'),
        scanId: z.string().optional().describe('Parent scan ID'),
        status: z.string().describe('Final status of the scan iteration'),
        completedAt: z.string().optional().describe('When the iteration completed')
      })
      .passthrough()
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        baseUrl: ctx.config.baseUrl
      });

      let lastPollTime = ctx.state?.lastPollTime as string | undefined;

      let result = await client.listScanIterations({
        page: 0,
        size: 50,
        sortBy: 'completedAt',
        sortOrder: 'desc'
      });

      let data = result?.data ?? result;
      let iterations: any[] = Array.isArray(data)
        ? data
        : (data?.content ?? data?.items ?? []);

      let completedStatuses = [
        'COMPLETED',
        'FAILED',
        'STOPPED',
        'completed',
        'failed',
        'stopped'
      ];
      let newIterations = iterations.filter((iter: any) => {
        let isCompleted = completedStatuses.includes(iter?.status);
        if (!isCompleted) return false;
        if (!lastPollTime) return true;
        let iterTime = iter?.completedAt ?? iter?.updatedAt ?? iter?.createdAt;
        return iterTime && iterTime > lastPollTime;
      });

      let latestTime = lastPollTime;
      for (let iter of newIterations) {
        let iterTime = iter?.completedAt ?? iter?.updatedAt ?? iter?.createdAt;
        if (iterTime && (!latestTime || iterTime > latestTime)) {
          latestTime = iterTime;
        }
      }

      return {
        inputs: newIterations.map((iter: any) => ({
          iterationId: iter.id ?? iter.iterationId ?? '',
          scanId: iter.scanId,
          status: iter.status ?? 'unknown',
          completedAt: iter.completedAt,
          iteration: iter
        })),
        updatedState: {
          lastPollTime: latestTime ?? new Date().toISOString()
        }
      };
    },

    handleEvent: async ctx => {
      let statusLower = (ctx.input.status ?? '').toLowerCase();
      let eventType =
        statusLower === 'failed'
          ? 'scan_iteration.failed'
          : statusLower === 'stopped'
            ? 'scan_iteration.stopped'
            : 'scan_iteration.completed';

      return {
        type: eventType,
        id: ctx.input.iterationId,
        output: {
          iterationId: ctx.input.iterationId,
          scanId: ctx.input.scanId,
          status: ctx.input.status,
          completedAt: ctx.input.completedAt,
          ...ctx.input.iteration
        }
      };
    }
  })
  .build();
