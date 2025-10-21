import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Airtable MCP Server
 * Provides tools and resources for interacting with Airtable bases, tables, records, and views
 */

interface Config {
  token: string;
}

metorial.createServer<Config>(
  {
    name: 'airtable-server',
    version: '1.0.0'
  },
  async (server, config: Config) => {
    // Airtable API Base URL
    const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';
    const AIRTABLE_META_API_BASE = 'https://api.airtable.com/v0/meta';

    /**
     * Helper function to make authenticated requests to Airtable API
     */
    async function airtableRequest<T>(
      endpoint: string,
      method: string = 'GET',
      body?: unknown
    ): Promise<T> {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(endpoint, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Airtable API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    }

    /**
     * Helper to build query string from parameters
     */
    function buildQueryString(params: Record<string, unknown>): string {
      const filtered = Object.entries(params)
        .filter(([_, value]) => value !== undefined && value !== null)
        .map(([key, value]) => {
          if (Array.isArray(value)) {
            return value
              .map(v => `${encodeURIComponent(key)}=${encodeURIComponent(JSON.stringify(v))}`)
              .join('&');
          }
          return `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`;
        })
        .join('&');
      return filtered ? `?${filtered}` : '';
    }

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Resource: Base
     * Access information about a specific Airtable base
     */
    server.registerResource(
      'base',
      new ResourceTemplate('airtable://base/{baseId}', { list: undefined }),
      {
        title: 'Airtable Base',
        description: 'Access information about a specific Airtable base'
      },
      async (uri, { baseId }) => {
        interface BaseInfo {
          id: string;
          name: string;
          permissionLevel: string;
        }

        const baseInfo = await airtableRequest<BaseInfo>(
          `${AIRTABLE_META_API_BASE}/bases/${baseId}`
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(baseInfo, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Table
     * Access schema and metadata for a specific table
     */
    server.registerResource(
      'table',
      new ResourceTemplate('airtable://base/{baseId}/table/{tableIdOrName}', {
        list: undefined
      }),
      {
        title: 'Airtable Table',
        description: 'Access schema and metadata for a specific table'
      },
      async (uri, { baseId, tableIdOrName }) => {
        interface TableInfo {
          id: string;
          name: string;
          primaryFieldId: string;
          fields: Array<{
            id: string;
            name: string;
            type: string;
            options?: Record<string, unknown>;
          }>;
          views: Array<{
            id: string;
            name: string;
            type: string;
          }>;
        }

        interface BaseTables {
          tables: TableInfo[];
        }

        const baseTables = await airtableRequest<BaseTables>(
          `${AIRTABLE_META_API_BASE}/bases/${baseId}/tables`
        );

        const table = baseTables.tables.find(
          t => t.id === tableIdOrName || t.name === tableIdOrName
        );

        if (!table) {
          throw new Error(`Table ${tableIdOrName} not found in base ${baseId}`);
        }

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(table, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Record
     * Access a specific record's data
     */
    server.registerResource(
      'record',
      new ResourceTemplate(
        'airtable://base/{baseId}/table/{tableIdOrName}/record/{recordId}',
        { list: undefined }
      ),
      {
        title: 'Airtable Record',
        description: "Access a specific record's data"
      },
      async (uri, { baseId, tableIdOrName, recordId }) => {
        interface AirtableRecord {
          id: string;
          createdTime: string;
          fields: Record<string, unknown>;
        }

        const record = await airtableRequest<AirtableRecord>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(
            tableIdOrName as string
          )}/${recordId}`
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(record, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: View
     * Access records filtered by a specific view
     */
    server.registerResource(
      'view',
      new ResourceTemplate(
        'airtable://base/{baseId}/table/{tableIdOrName}/view/{viewIdOrName}',
        { list: undefined }
      ),
      {
        title: 'Airtable View',
        description: 'Access records filtered by a specific view'
      },
      async (uri, { baseId, tableIdOrName, viewIdOrName }) => {
        interface RecordsResponse {
          records: Array<{
            id: string;
            createdTime: string;
            fields: Record<string, unknown>;
          }>;
          offset?: string;
        }

        const queryString = buildQueryString({ view: viewIdOrName });
        const records = await airtableRequest<RecordsResponse>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(
            tableIdOrName as string
          )}${queryString}`
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(records, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS
    // ============================================================================

    /**
     * Tool: list_bases
     * List all accessible Airtable bases
     */
    server.registerTool(
      'list_bases',
      {
        title: 'List Bases',
        description: 'List all accessible Airtable bases',
        inputSchema: {}
      },
      async () => {
        interface BasesResponse {
          bases: Array<{
            id: string;
            name: string;
            permissionLevel: string;
          }>;
          offset?: string;
        }

        const bases = await airtableRequest<BasesResponse>(`${AIRTABLE_META_API_BASE}/bases`);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(bases.bases, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: list_tables
     * List all tables in a specific base
     */
    server.registerTool(
      'list_tables',
      {
        title: 'List Tables',
        description: 'List all tables in a specific base',
        inputSchema: {
          baseId: z.string().describe('The ID of the base')
        }
      },
      async ({ baseId }) => {
        interface TablesResponse {
          tables: Array<{
            id: string;
            name: string;
            primaryFieldId: string;
            fields: Array<{
              id: string;
              name: string;
              type: string;
            }>;
            views: Array<{
              id: string;
              name: string;
              type: string;
            }>;
          }>;
        }

        const tables = await airtableRequest<TablesResponse>(
          `${AIRTABLE_META_API_BASE}/bases/${baseId}/tables`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(tables.tables, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: list_records
     * List/query records from a table with optional filtering, sorting, and pagination
     */
    server.registerTool(
      'list_records',
      {
        title: 'List Records',
        description:
          'List/query records from a table with optional filtering, sorting, and pagination',
        inputSchema: {
          baseId: z.string().describe('The ID of the base'),
          tableIdOrName: z.string().describe('The ID or name of the table'),
          view: z.string().optional().describe('View ID or name to filter records'),
          filterByFormula: z
            .string()
            .optional()
            .describe('Airtable formula for filtering records'),
          maxRecords: z.number().optional().describe('Maximum number of records to return'),
          pageSize: z.number().optional().describe('Number of records per page (max 100)'),
          sort: z
            .array(
              z.object({
                field: z.string(),
                direction: z.enum(['asc', 'desc'])
              })
            )
            .optional()
            .describe('Sort configuration'),
          fields: z.array(z.string()).optional().describe('Array of field names to return'),
          offset: z.string().optional().describe('Pagination offset from previous response')
        }
      },
      async ({
        baseId,
        tableIdOrName,
        view,
        filterByFormula,
        maxRecords,
        pageSize,
        sort,
        fields,
        offset
      }) => {
        interface RecordsResponse {
          records: Array<{
            id: string;
            createdTime: string;
            fields: Record<string, unknown>;
          }>;
          offset?: string;
        }

        const params: Record<string, unknown> = {
          view,
          filterByFormula,
          maxRecords,
          pageSize,
          offset
        };

        if (sort) {
          sort.forEach((s, i) => {
            params[`sort[${i}][field]`] = s.field;
            params[`sort[${i}][direction]`] = s.direction;
          });
        }

        if (fields) {
          fields.forEach((field, i) => {
            params[`fields[${i}]`] = field;
          });
        }

        const queryString = buildQueryString(params);
        const records = await airtableRequest<RecordsResponse>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}${queryString}`
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(records, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: create_record
     * Create a new record in a table
     */
    server.registerTool(
      'create_record',
      {
        title: 'Create Record',
        description: 'Create a new record in a table',
        inputSchema: {
          baseId: z.string().describe('The ID of the base'),
          tableIdOrName: z.string().describe('The ID or name of the table'),
          fields: z.record(z.unknown()).describe('Object with field names and values')
        }
      },
      async ({ baseId, tableIdOrName, fields }) => {
        interface RecordResponse {
          id: string;
          createdTime: string;
          fields: Record<string, unknown>;
        }

        const record = await airtableRequest<RecordResponse>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}`,
          'POST',
          { fields }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(record, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: create_records
     * Create multiple records in a table (batch operation)
     */
    server.registerTool(
      'create_records',
      {
        title: 'Create Records',
        description: 'Create multiple records in a table (batch operation, max 10 at a time)',
        inputSchema: {
          baseId: z.string().describe('The ID of the base'),
          tableIdOrName: z.string().describe('The ID or name of the table'),
          records: z.array(z.record(z.unknown())).describe('Array of field objects (max 10)')
        }
      },
      async ({ baseId, tableIdOrName, records }) => {
        interface RecordsResponse {
          records: Array<{
            id: string;
            createdTime: string;
            fields: Record<string, unknown>;
          }>;
        }

        const recordsPayload = records.map(fields => ({ fields }));

        const response = await airtableRequest<RecordsResponse>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}`,
          'POST',
          { records: recordsPayload }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.records, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: update_record
     * Update an existing record
     */
    server.registerTool(
      'update_record',
      {
        title: 'Update Record',
        description: 'Update an existing record',
        inputSchema: {
          baseId: z.string().describe('The ID of the base'),
          tableIdOrName: z.string().describe('The ID or name of the table'),
          recordId: z.string().describe('The ID of the record to update'),
          fields: z
            .record(z.unknown())
            .describe('Object with field names and values to update')
        }
      },
      async ({ baseId, tableIdOrName, recordId, fields }) => {
        interface RecordResponse {
          id: string;
          createdTime: string;
          fields: Record<string, unknown>;
        }

        const record = await airtableRequest<RecordResponse>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`,
          'PATCH',
          { fields }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(record, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: update_records
     * Update multiple records (batch operation)
     */
    server.registerTool(
      'update_records',
      {
        title: 'Update Records',
        description: 'Update multiple records (batch operation, max 10 at a time)',
        inputSchema: {
          baseId: z.string().describe('The ID of the base'),
          tableIdOrName: z.string().describe('The ID or name of the table'),
          records: z
            .array(
              z.object({
                id: z.string(),
                fields: z.record(z.unknown())
              })
            )
            .describe('Array of objects with record id and fields to update (max 10)')
        }
      },
      async ({ baseId, tableIdOrName, records }) => {
        interface RecordsResponse {
          records: Array<{
            id: string;
            createdTime: string;
            fields: Record<string, unknown>;
          }>;
        }

        const response = await airtableRequest<RecordsResponse>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}`,
          'PATCH',
          { records }
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.records, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: delete_record
     * Delete a specific record
     */
    server.registerTool(
      'delete_record',
      {
        title: 'Delete Record',
        description: 'Delete a specific record',
        inputSchema: {
          baseId: z.string().describe('The ID of the base'),
          tableIdOrName: z.string().describe('The ID or name of the table'),
          recordId: z.string().describe('The ID of the record to delete')
        }
      },
      async ({ baseId, tableIdOrName, recordId }) => {
        interface DeleteResponse {
          deleted: boolean;
          id: string;
        }

        const response = await airtableRequest<DeleteResponse>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}/${recordId}`,
          'DELETE'
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: delete_records
     * Delete multiple records (batch operation)
     */
    server.registerTool(
      'delete_records',
      {
        title: 'Delete Records',
        description: 'Delete multiple records (batch operation, max 10 at a time)',
        inputSchema: {
          baseId: z.string().describe('The ID of the base'),
          tableIdOrName: z.string().describe('The ID or name of the table'),
          recordIds: z.array(z.string()).describe('Array of record IDs to delete (max 10)')
        }
      },
      async ({ baseId, tableIdOrName, recordIds }) => {
        interface DeleteResponse {
          records: Array<{
            deleted: boolean;
            id: string;
          }>;
        }

        const queryString = recordIds.map(id => `records[]=${id}`).join('&');
        const response = await airtableRequest<DeleteResponse>(
          `${AIRTABLE_API_BASE}/${baseId}/${encodeURIComponent(tableIdOrName)}?${queryString}`,
          'DELETE'
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(response.records, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: get_table_schema
     * Get detailed schema information for a table
     */
    server.registerTool(
      'get_table_schema',
      {
        title: 'Get Table Schema',
        description:
          'Get detailed schema information for a table including field types and configurations',
        inputSchema: {
          baseId: z.string().describe('The ID of the base'),
          tableIdOrName: z.string().describe('The ID or name of the table')
        }
      },
      async ({ baseId, tableIdOrName }) => {
        interface TablesResponse {
          tables: Array<{
            id: string;
            name: string;
            primaryFieldId: string;
            fields: Array<{
              id: string;
              name: string;
              type: string;
              options?: Record<string, unknown>;
              description?: string;
            }>;
            views: Array<{
              id: string;
              name: string;
              type: string;
            }>;
          }>;
        }

        const tables = await airtableRequest<TablesResponse>(
          `${AIRTABLE_META_API_BASE}/bases/${baseId}/tables`
        );

        const table = tables.tables.find(
          t => t.id === tableIdOrName || t.name === tableIdOrName
        );

        if (!table) {
          throw new Error(`Table ${tableIdOrName} not found in base ${baseId}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(table, null, 2)
            }
          ]
        };
      }
    );
  }
);
