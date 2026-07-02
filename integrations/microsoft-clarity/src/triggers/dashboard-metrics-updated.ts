import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { ClarityClient } from '../lib/client';
import { spec } from '../spec';

let metricInformationSchema = z.record(
  z.string(),
  z.union([z.string(), z.number()]).optional()
);

let dashboardMetricSchema = z.object({
  metricName: z.string().describe('Name of the metric'),
  information: z.array(metricInformationSchema).describe('Data points for this metric')
});

export let dashboardMetricsUpdated = SlateTrigger.create(spec, {
  name: 'Dashboard Metrics Updated',
  key: 'dashboard_metrics_updated',
  description:
    'Polls Microsoft Clarity dashboard data periodically and emits events when new metric snapshots are available. Captures traffic, engagement, and behavioral insight metrics for the last 24 hours.',
  constraints: [
    'Maximum of 10 API requests per project per day. Set polling interval accordingly.',
    'Data is limited to the last 24 hours.',
    'Responses are limited to 1,000 rows.'
  ]
})
  .input(
    z.object({
      snapshotId: z.string().describe('Unique identifier for this metric snapshot'),
      polledAt: z.string().describe('ISO 8601 timestamp when the data was polled'),
      metrics: z.array(dashboardMetricSchema).describe('Array of dashboard metrics')
    })
  )
  .output(
    z.object({
      polledAt: z.string().describe('ISO 8601 timestamp when the data was polled'),
      metrics: z
        .array(dashboardMetricSchema)
        .describe('Array of dashboard metrics with their data points'),
      metricNames: z.array(z.string()).describe('Names of metrics included in this snapshot')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new ClarityClient(ctx.auth.token);

      let metrics = await client.getDashboardInsights({
        numOfDays: 1
      });

      let polledAt = new Date().toISOString();
      let snapshotId = `snapshot-${polledAt}`;

      let lastSnapshotHash = ctx.state?.lastSnapshotHash ?? null;
      let currentHash = JSON.stringify(metrics);

      if (currentHash === lastSnapshotHash) {
        return {
          inputs: [],
          updatedState: {
            lastSnapshotHash: currentHash,
            lastPolledAt: polledAt
          }
        };
      }

      return {
        inputs: [
          {
            snapshotId,
            polledAt,
            metrics
          }
        ],
        updatedState: {
          lastSnapshotHash: currentHash,
          lastPolledAt: polledAt
        }
      };
    },

    handleEvent: async ctx => {
      let metricNames = ctx.input.metrics.map(m => m.metricName);

      return {
        type: 'dashboard_metrics.updated',
        id: ctx.input.snapshotId,
        output: {
          polledAt: ctx.input.polledAt,
          metrics: ctx.input.metrics,
          metricNames
        }
      };
    }
  })
  .build();
