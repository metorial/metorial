import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import type { MotherDuckClient } from '../lib/client';
import { getMotherDuckInvocationNotice, invokeMotherDuckTool } from './native';

let fakeClient = (rows: Record<string, unknown>[] = []) => {
  let query = vi.fn(async (sql: string, _values: unknown[] = [], _database = 'md:') => ({
    rows: sql.startsWith('SELECT to_json') ? rows.map(result => ({ result })) : rows,
    fields: Object.keys(rows[0] ?? {}).map((name, index) => ({
      name,
      tableID: 0,
      columnID: index,
      dataTypeID: 25,
      dataTypeSize: -1,
      dataTypeModifier: -1,
      format: 'text' as const
    })),
    rowCount: rows.length
  }));
  return { client: { query } as unknown as MotherDuckClient, query };
};

describe('MotherDuck native tool execution', () => {
  it('returns stable authenticated-user and organization identity', async () => {
    let { client, query } = fakeClient([
      {
        user_id: 'user-1',
        username: 'ada@example.com',
        org_id: 'org-1',
        org_name: 'Analytics',
        region: 'eu-central-1'
      }
    ]);

    let output = await invokeMotherDuckTool(client, 'get_current_user', {});

    expect(query).toHaveBeenCalledWith('SELECT * FROM MD_USER_INFO()');
    expect(output).toEqual({
      success: true,
      user: {
        id: 'user-1',
        username: 'ada@example.com',
        organization_id: 'org-1',
        organization_name: 'Analytics',
        region: 'eu-central-1'
      }
    });
  });

  it('executes query through SQL and preserves tabular output', async () => {
    let { client, query } = fakeClient([{ answer: 42 }]);

    let output = await invokeMotherDuckTool(client, 'query', {
      database: 'analytics',
      sql: 'SELECT 42 AS answer'
    });

    expect(query).toHaveBeenCalledWith('SELECT 42 AS answer', [], 'analytics');
    expect(output).toMatchObject({
      success: true,
      columns: ['answer'],
      rows: [[42]],
      rowCount: 1
    });
  });

  it('does not reinterpret JSON-looking VARCHAR values as structured output', async () => {
    let { client } = fakeClient([{ payload: '{"literal":true}' }]);

    let output = await invokeMotherDuckTool(client, 'query', {
      database: 'analytics',
      sql: 'SELECT payload FROM text_values'
    });

    expect(output.rows).toEqual([['{"literal":true}']]);
  });

  it('preserves JSON-looking Guide content as markdown text', async () => {
    let { client } = fakeClient([
      {
        id: '99a8ec93-2ae5-49c3-8adf-e6f50a829326',
        title: 'JSON example',
        content: '{"literal":true}',
        current_version: 1,
        access: 'user',
        references: []
      }
    ]);

    let output = await invokeMotherDuckTool(client, 'get_guide', {
      uuid: '99a8ec93-2ae5-49c3-8adf-e6f50a829326'
    });

    expect(output.text).toContain('{"literal":true}');
  });

  it('rejects mutating statements and mutating table functions in the read-only tool', async () => {
    let { client, query } = fakeClient();

    await expect(
      invokeMotherDuckTool(client, 'query', {
        database: 'analytics',
        sql: 'WITH source AS (SELECT 1) DELETE FROM events'
      })
    ).rejects.toThrow('read-only SQL only');
    await expect(
      invokeMotherDuckTool(client, 'query', {
        database: 'analytics',
        sql: "SELECT * FROM MD_DELETE_DIVE('99a8ec93-2ae5-49c3-8adf-e6f50a829326')"
      })
    ).rejects.toThrow('read-only SQL only');
    await expect(
      invokeMotherDuckTool(client, 'query', {
        database: 'analytics',
        sql: `SELECT * FROM query('SELECT * FROM MD_DELETE_DIVE(''99a8ec93-2ae5-49c3-8adf-e6f50a829326'')')`
      })
    ).rejects.toThrow('read-only SQL only');
    expect(query).not.toHaveBeenCalled();
  });

  it('allows the documented ATTACH and DETACH workflow for read-only database shares', async () => {
    let { client, query } = fakeClient();

    await invokeMotherDuckTool(client, 'query', {
      database: 'md:',
      sql: "ATTACH 'md:_share/sample/share-id' AS sample_share"
    });
    await invokeMotherDuckTool(client, 'query', {
      database: 'md:',
      sql: 'DETACH sample_share'
    });

    expect(query).toHaveBeenCalledWith(
      "ATTACH 'md:_share/sample/share-id' AS sample_share",
      [],
      'md:'
    );
    expect(query).toHaveBeenCalledWith('DETACH sample_share', [], 'md:');
  });

  it('caps query output at the official row limit and reports truncation outside the schema', async () => {
    let { client } = fakeClient(Array.from({ length: 2_100 }, (_, answer) => ({ answer })));

    let output = await invokeMotherDuckTool(client, 'query', {
      database: 'analytics',
      sql: 'SELECT answer FROM large_result'
    });

    expect(output.rows).toHaveLength(2_048);
    expect(output.rowCount).toBe(2_048);
    expect(getMotherDuckInvocationNotice(output)).toContain('truncated result');
    expect(JSON.stringify(output)).not.toContain('motherduckInvocationNotice');
  });

  it('maps Flight creation to the documented native table function', async () => {
    let { client, query } = fakeClient([
      {
        id: '99a8ec93-2ae5-49c3-8adf-e6f50a829326',
        name: 'daily-ingest',
        schedule_cron: null,
        current_version: 1
      }
    ]);

    let output = await invokeMotherDuckTool(client, 'create_flight', {
      name: 'daily-ingest',
      source_code: 'print("ok")',
      config: { TARGET: 'analytics' }
    });

    expect(query).toHaveBeenCalledOnce();
    expect(query.mock.calls[0]?.[0]).toContain('SELECT * FROM MD_CREATE_FLIGHT(');
    expect(query.mock.calls[0]?.[0]).toContain('config := CAST(');
    expect(query.mock.calls[0]?.[1]).toEqual([
      'daily-ingest',
      'print("ok")',
      JSON.stringify({ TARGET: 'analytics' })
    ]);
    expect(output).toMatchObject({
      success: true,
      flight: { name: 'daily-ingest', current_version: 1 }
    });
  });

  it('reconstructs Guide navigation without loading root Guide bodies', async () => {
    let { client, query } = fakeClient([
      {
        id: '99a8ec93-2ae5-49c3-8adf-e6f50a829326',
        topic: null,
        title: 'Warehouse overview',
        description: 'Where data lives',
        access: 'organization',
        content: 'private root body'
      },
      {
        id: '99a8ec93-2ae5-49c3-8adf-e6f50a829327',
        topic: 'revenue',
        title: 'MRR',
        description: 'Revenue definitions',
        access: 'organization'
      },
      {
        id: '99a8ec93-2ae5-49c3-8adf-e6f50a829328',
        topic: 'dives/design',
        title: 'Dive styling',
        description: 'Reserved Dive guidance',
        access: 'organization'
      }
    ]);

    let output = await invokeMotherDuckTool(client, 'get_query_guide', {});

    expect(query).toHaveBeenCalledOnce();
    expect(output.text).toContain('Use list_guides');
    expect(output.text).toContain('- revenue/ (1 guide)');
    expect(output.text).toContain('Warehouse overview');
    expect(output.text).not.toContain('private root body');
    expect(output.text).not.toContain('Dive styling');
  });

  it('paginates Guide listings instead of silently omitting entries after 500', async () => {
    let firstPage = Array.from({ length: 500 }, (_, index) => ({
      id: `guide-${index}`,
      topic: 'metrics',
      title: `Metric ${index}`,
      access: 'organization'
    }));
    let query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: firstPage.map(result => ({ result })),
        fields: [],
        rowCount: firstPage.length
      })
      .mockResolvedValueOnce({
        rows: [
          {
            result: {
              id: 'guide-500',
              topic: 'metrics',
              title: 'Metric 500',
              access: 'organization'
            }
          }
        ],
        fields: [],
        rowCount: 1
      });
    let client = { query } as unknown as MotherDuckClient;

    let output = await invokeMotherDuckTool(client, 'list_guides', { topic: 'metrics' });

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[1]).toEqual(['metrics', 500, 500]);
    expect(output.guides).toHaveLength(501);
  });

  it('paginates native Flight listings before applying public offset and keyword filters', async () => {
    let firstPage = Array.from({ length: 500 }, (_, index) => ({
      flight_id: `flight-${index}`,
      flight_name: `Unmatched ${index}`,
      current_version: 1
    }));
    let query = vi
      .fn()
      .mockResolvedValueOnce({
        rows: firstPage.map(result => ({ result })),
        fields: [],
        rowCount: firstPage.length
      })
      .mockResolvedValueOnce({
        rows: [
          {
            result: {
              flight_id: 'flight-500',
              flight_name: 'Daily Revenue',
              current_version: 1
            }
          }
        ],
        fields: [],
        rowCount: 1
      });
    let client = { query } as unknown as MotherDuckClient;

    let output = await invokeMotherDuckTool(client, 'list_flights', {
      keywords: 'revenue',
      limit: 50,
      offset: 0
    });

    expect(query).toHaveBeenCalledTimes(2);
    expect(query.mock.calls[1]?.[1]).toEqual([500, 500]);
    expect(output.flights).toHaveLength(1);
    expect(output.flights[0]?.flight_name).toBe('Daily Revenue');
    expect(output.totalCount).toBe(1);
  });

  it('carries view_dive initial state in a base64url URL fragment', async () => {
    let { client } = fakeClient([
      {
        id: '99a8ec93-2ae5-49c3-8adf-e6f50a829326',
        title: 'Monthly Revenue',
        content: 'export default function Dive() {}',
        current_version: 3,
        required_resources: []
      }
    ]);

    let output = await invokeMotherDuckTool(client, 'view_dive', {
      dive_id: '99a8ec93-2ae5-49c3-8adf-e6f50a829326',
      initial_state: { region: 'emea' }
    });

    expect(output.dive_app_url).toBe(
      `https://app.motherduck.com/dives/99a8ec93-2ae5-49c3-8adf-e6f50a829326/monthly-revenue#state=${Buffer.from(
        JSON.stringify({ region: 'emea' })
      ).toString('base64url')}`
    );
  });

  it('uses fuzzy catalog scoring and enforces balanced result limits', async () => {
    let catalogRows = [
      ...Array.from({ length: 50 }, (_, index) => ({
        type: 'table',
        name: `sales_table_${index}`,
        fully_qualified_name: `analytics.main.sales_table_${index}`,
        database: 'analytics',
        schema: 'main',
        table_name: null,
        data_type: null,
        comment: null,
        relevance_score: 0.8
      })),
      ...Array.from({ length: 50 }, (_, index) => ({
        type: 'column',
        name: `sales_column_${index}`,
        fully_qualified_name: `analytics.main.orders.sales_column_${index}`,
        database: 'analytics',
        schema: 'main',
        table_name: 'orders',
        data_type: 'VARCHAR',
        comment: null,
        relevance_score: 0.8
      }))
    ];
    let shareRows = Array.from({ length: 20 }, (_, index) => ({
      name: `sales_share_${index}`,
      url: `md:_share/sales/${index}`
    }));
    let query = vi.fn(async (sql: string) => ({
      rows: sql.includes('SHARED_WITH_ME') ? shareRows : catalogRows,
      fields: [],
      rowCount: 0
    }));
    let client = { query } as unknown as MotherDuckClient;

    let output = await invokeMotherDuckTool(client, 'search_catalog', { query: 'sales' });
    let counts = Object.groupBy(output.results, (row: Record<string, unknown>) =>
      String(row.type)
    );

    expect(query.mock.calls[0]?.[0]).toContain('jaro_winkler_similarity');
    expect(counts.table).toHaveLength(30);
    expect(counts.column).toHaveLength(40);
    expect(counts.share).toHaveLength(10);
    expect(output.results).toHaveLength(80);
    expect(counts.share?.[0]?.dataType).toContain('md:_share/');
  });

  it('contains no production remote-MCP transport or endpoint', async () => {
    let directory = fileURLToPath(new URL('../', import.meta.url));
    let sources = await Promise.all(
      ['auth.ts', 'lib/client.ts', 'tools/factory.ts', 'tools/native.ts'].map(path =>
        readFile(new URL(path, new URL('../', import.meta.url)), 'utf8')
      )
    );
    let productionSource = sources.join('\n');

    expect(directory).toContain('/motherduck/src/');
    expect(productionSource).not.toContain('RemoteMcpClient');
    expect(productionSource).not.toContain('StreamableHTTP');
    expect(productionSource).not.toContain('@modelcontextprotocol/sdk');
    expect(productionSource).not.toContain('/mcp');
  });
});
