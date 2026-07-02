import { describe, expect, it } from 'vitest';
import {
  assertValidEvents,
  assertValidMetrics,
  toAlertIssuesFilterInput,
  toDashboardPageInputs,
  toMetricPayload,
  toTracePayload
} from './client';

describe('New Relic client payload helpers', () => {
  it('builds Metric API payloads for count and summary metrics', () => {
    let metrics = [
      {
        name: 'service.errors',
        type: 'count',
        value: 4,
        timestamp: 1_700_000_000,
        intervalMs: 10_000,
        attributes: { 'service.name': 'api' }
      },
      {
        name: 'service.response.duration',
        type: 'summary',
        value: {
          count: 5,
          sum: 100,
          min: 1,
          max: 50
        },
        timestamp: 1_700_000_001,
        intervalMs: 10_000
      }
    ];

    expect(() => assertValidMetrics(metrics)).not.toThrow();
    expect(toMetricPayload(metrics)).toEqual([
      {
        metrics: [
          {
            name: 'service.errors',
            type: 'count',
            value: 4,
            timestamp: 1_700_000_000,
            'interval.ms': 10_000,
            attributes: { 'service.name': 'api' }
          },
          {
            name: 'service.response.duration',
            type: 'summary',
            value: {
              count: 5,
              sum: 100,
              min: 1,
              max: 50
            },
            timestamp: 1_700_000_001,
            'interval.ms': 10_000,
            attributes: {}
          }
        ]
      }
    ]);
  });

  it('rejects metric payloads that New Relic would asynchronously drop', () => {
    expect(() =>
      assertValidMetrics([
        {
          name: 'service.errors',
          type: 'count',
          value: 1
        }
      ])
    ).toThrow(/intervalMs/);

    expect(() =>
      assertValidMetrics([
        {
          name: 'service.response.duration',
          type: 'summary',
          value: 1,
          intervalMs: 10_000
        }
      ])
    ).toThrow(/summary metric value/);
  });

  it('validates Event API attribute shapes', () => {
    expect(() =>
      assertValidEvents([
        {
          eventType: 'Deploy:Run_1',
          status: 'ok',
          durationMs: 42
        }
      ])
    ).not.toThrow();

    expect(() =>
      assertValidEvents([
        {
          eventType: 'Deploy',
          nested: { unsupported: true }
        }
      ])
    ).toThrow(/must be a string or number/);
  });

  it('builds Trace API payloads with top-level span timestamps', () => {
    let payload = toTracePayload([
      {
        traceId: 'trace-1',
        spanId: 'span-1',
        parentId: 'parent-1',
        serviceName: 'checkout-api',
        name: 'POST /checkout',
        durationMs: 12.5,
        timestamp: 1_700_000_000_000,
        attributes: {
          'service.name': 'wrong-service',
          custom: 'value'
        }
      }
    ]);

    expect(payload).toEqual([
      {
        spans: [
          {
            'trace.id': 'trace-1',
            id: 'span-1',
            timestamp: 1_700_000_000_000,
            attributes: {
              'service.name': 'checkout-api',
              name: 'POST /checkout',
              'duration.ms': 12.5,
              'parent.id': 'parent-1',
              custom: 'value'
            }
          }
        ]
      }
    ]);
    expect(payload[0]?.spans[0]?.attributes).not.toHaveProperty('timestamp');
  });

  it('maps dashboard read shapes back to dashboard update inputs', () => {
    expect(
      toDashboardPageInputs([
        {
          pageGuid: 'page-1',
          name: 'Overview',
          widgets: [
            {
              widgetId: 'widget-1',
              title: 'Errors',
              visualization: 'viz.table',
              rawConfiguration: { nrqlQueries: [] },
              layout: { column: 1, row: 1, width: 4, height: 3 },
              linkedEntityGuids: ['entity-1']
            },
            {
              id: 'widget-2',
              title: 'Latency',
              visualization: { id: 'viz.line' },
              rawConfiguration: { nrqlQueries: [] },
              linkedEntities: [{ guid: 'entity-2' }, { guid: null }]
            }
          ]
        }
      ])
    ).toEqual([
      {
        guid: 'page-1',
        name: 'Overview',
        description: '',
        widgets: [
          {
            id: 'widget-1',
            title: 'Errors',
            visualization: { id: 'viz.table' },
            rawConfiguration: { nrqlQueries: [] },
            layout: { column: 1, row: 1, width: 4, height: 3 },
            linkedEntityGuids: ['entity-1']
          },
          {
            id: 'widget-2',
            title: 'Latency',
            visualization: { id: 'viz.line' },
            rawConfiguration: { nrqlQueries: [] },
            layout: undefined,
            linkedEntityGuids: ['entity-2']
          }
        ]
      }
    ]);
  });

  it('builds AiIssues filter payloads from public tool fields', () => {
    expect(
      toAlertIssuesFilterInput({
        states: ['ACTIVATED', 'CLOSED'],
        priorities: ['HIGH', 'CRITICAL'],
        entityGuids: ['entity-1'],
        entityTypes: ['SYNTHETIC_MONITOR'],
        issueIds: ['issue-1'],
        conditionIds: [123],
        contains: 'latency',
        isAcknowledged: false,
        isCorrelated: true,
        mutingStates: ['NOT_MUTED'],
        policyIds: [456],
        sources: ['newrelic']
      })
    ).toEqual({
      states: ['ACTIVATED', 'CLOSED'],
      priority: ['HIGH', 'CRITICAL'],
      entityGuids: ['entity-1'],
      entityTypes: ['SYNTHETIC_MONITOR'],
      ids: ['issue-1'],
      conditionIds: [123],
      contains: 'latency',
      isAcknowledged: false,
      isCorrelated: true,
      mutingStates: ['NOT_MUTED'],
      policyIds: [456],
      sources: ['newrelic']
    });
  });
});
