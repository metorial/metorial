import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it, vi } from 'vitest';
import {
  assertValidEvents,
  assertValidMetrics,
  NerdGraphClient,
  requireEntitySearchQuery,
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

  it('requires a non-empty query and converts plain text to a name search', () => {
    expect(() => requireEntitySearchQuery()).toThrow(ServiceError);
    expect(() => requireEntitySearchQuery('   ')).toThrow(ServiceError);
    expect(requireEntitySearchQuery('  tracker-gateway-ws  ')).toBe(
      "name LIKE 'tracker-gateway-ws'"
    );
    expect(requireEntitySearchQuery('  built in Warsaw  ')).toBe(
      "name LIKE 'built in Warsaw'"
    );
    expect(requireEntitySearchQuery('  this is prod  ')).toBe("name LIKE 'this is prod'");
    expect(requireEntitySearchQuery('  service=checkout  ')).toBe(
      "name LIKE 'service=checkout'"
    );
    expect(requireEntitySearchQuery("  type = 'APPLICATION'  ")).toBe("type = 'APPLICATION'");
    expect(
      requireEntitySearchQuery("  (domain = 'INFRA') AND tags.environment = 'production'  ")
    ).toBe("(domain = 'INFRA') AND tags.environment = 'production'");
    expect(requireEntitySearchQuery('  indexedAt > 1700000000000  ')).toBe(
      'indexedAt > 1700000000000'
    );
    expect(requireEntitySearchQuery("  tags.`aws.accountId` = '123'  ")).toBe(
      "tags.`aws.accountId` = '123'"
    );
  });

  it('sends entity search as a required GraphQL variable with alert fields in a fragment', async () => {
    let client = new NerdGraphClient({
      token: 'token',
      region: 'us',
      accountId: '123'
    });
    let query = vi.spyOn(client, 'query').mockResolvedValue({
      actor: { entitySearch: { count: 0, results: { entities: [] } } }
    });

    await client.searchEntities({
      query: "  type = 'APPLICATION'  ",
      cursor: 'next-page'
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(
        /query\(\$query: String!, \$cursor: String\)[\s\S]*accountId[\s\S]*\.\.\. on AlertableEntityOutline \{\s*alertSeverity\s*\}/
      ),
      {
        query: "type = 'APPLICATION'",
        cursor: 'next-page'
      }
    );

    await client.searchEntities({
      query: 'tracker-gateway-ws'
    });

    expect(query).toHaveBeenLastCalledWith(expect.any(String), {
      query: "name LIKE 'tracker-gateway-ws'",
      cursor: undefined
    });
  });

  it('includes the required value function when creating an NRQL alert condition', async () => {
    let client = new NerdGraphClient({
      token: 'token',
      region: 'us',
      accountId: '123'
    });
    let query = vi.spyOn(client, 'query').mockResolvedValue({
      alertsNrqlConditionStaticCreate: {
        id: 'condition-1',
        name: 'Synthetic failures'
      }
    });

    await client.createNrqlAlertCondition('policy-1', {
      name: 'Synthetic failures',
      nrql: 'SELECT count(*) FROM SyntheticCheck',
      enabled: false,
      type: 'STATIC',
      critical: {
        threshold: 1,
        thresholdDuration: 300,
        operator: 'ABOVE',
        thresholdOccurrences: 'AT_LEAST_ONCE'
      },
      violationTimeLimitSeconds: 3600
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('alertsNrqlConditionStaticCreate'),
      {
        accountId: 123,
        policyId: 'policy-1',
        condition: {
          name: 'Synthetic failures',
          enabled: false,
          nrql: { query: 'SELECT count(*) FROM SyntheticCheck' },
          terms: [
            {
              threshold: 1,
              thresholdDuration: 300,
              operator: 'ABOVE',
              thresholdOccurrences: 'AT_LEAST_ONCE',
              priority: 'CRITICAL'
            }
          ],
          valueFunction: 'SINGLE_VALUE',
          signal: {
            aggregationWindow: 60,
            aggregationMethod: 'EVENT_FLOW',
            aggregationDelay: 120
          },
          violationTimeLimitSeconds: 3600
        }
      }
    );
  });

  it('omits the static value function when creating a baseline NRQL alert condition', async () => {
    let client = new NerdGraphClient({
      token: 'token',
      region: 'us',
      accountId: '123'
    });
    let query = vi.spyOn(client, 'query').mockResolvedValue({
      alertsNrqlConditionBaselineCreate: {
        id: 'condition-2',
        name: 'Latency baseline'
      }
    });

    await client.createNrqlAlertCondition('policy-1', {
      name: 'Latency baseline',
      nrql: 'SELECT average(duration) FROM Transaction',
      type: 'BASELINE',
      baselineDirection: 'UPPER_ONLY',
      critical: {
        threshold: 3,
        thresholdDuration: 300,
        operator: 'ABOVE',
        thresholdOccurrences: 'ALL'
      }
    });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('alertsNrqlConditionBaselineCreate'),
      expect.objectContaining({
        condition: expect.objectContaining({
          baselineDirection: 'UPPER_ONLY'
        })
      })
    );
    expect(query.mock.calls[0]?.[1]?.condition).not.toHaveProperty('valueFunction');
  });

  it('requests only supported NRQL result metadata fields', async () => {
    let client = new NerdGraphClient({
      token: 'token',
      region: 'us',
      accountId: '123'
    });
    let query = vi.spyOn(client, 'query').mockResolvedValue({
      actor: {
        account: {
          nrql: {
            results: [{ count: 1 }],
            metadata: { facets: [] }
          }
        }
      }
    });

    await client.runNrql('SELECT count(*) FROM Transaction SINCE 1 hour ago');

    expect(query).toHaveBeenCalledWith(
      expect.stringMatching(/results\s+metadata\s*\{\s*facets\s*\}/),
      {
        accountId: 123,
        nrql: 'SELECT count(*) FROM Transaction SINCE 1 hour ago',
        timeout: 30
      }
    );
    expect(query.mock.calls[0]?.[0]).not.toContain('timeWindow');
  });

  it('opts alert issue queries into the AiIssues schema', async () => {
    let client = new NerdGraphClient({
      token: 'token',
      region: 'us',
      accountId: '123'
    });
    let query = vi.spyOn(client, 'query').mockResolvedValue({
      actor: {
        account: {
          aiIssues: { issues: { issues: [], nextCursor: null } }
        }
      }
    });

    await client.listAlertIssues({ filter: { states: ['ACTIVATED'] } });

    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('$filter: AiIssuesFilterIssues'),
      {
        accountId: 123,
        cursor: undefined,
        filter: { states: ['ACTIVATED'] },
        timeWindow: undefined
      },
      { 'nerd-graph-unsafe-experimental-opt-in': 'AiIssues' }
    );
  });
});
