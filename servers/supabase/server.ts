import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Supabase MCP Server
 * Provides tools and resources for interacting with Supabase projects
 * via the HTTP REST API
 */

interface Config {
  token: string;
  projectId: string;
}

metorial.createServer<Config>(
  {
    name: 'supabase-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Base URL for Supabase API
    const getBaseUrl = () => `https://${config.projectId}.supabase.co`;
    const getRestUrl = () => `${getBaseUrl()}/rest/v1`;
    const getAuthUrl = () => `${getBaseUrl()}/auth/v1/admin`;
    const getStorageUrl = () => `${getBaseUrl()}/storage/v1`;

    /**
     * Common headers for API requests
     */
    const getHeaders = (contentType = 'application/json') => ({
      apikey: config.token,
      Authorization: `Bearer ${config.token}`,
      'Content-Type': contentType,
      Prefer: 'return=representation'
    });

    /**
     * Helper function to make HTTP requests
     */
    async function makeRequest(
      url: string,
      method: string,
      body?: any,
      customHeaders?: Record<string, string>
    ): Promise<any> {
      const headers = { ...getHeaders(), ...customHeaders };

      const options: RequestInit = {
        method,
        headers
      };

      if (body && (method === 'POST' || method === 'PATCH' || method === 'PUT')) {
        options.body = typeof body === 'string' ? body : JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Supabase API error (${response.status}): ${errorText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      }

      return await response.text();
    }

    /**
     * Build query string from filters
     */
    function buildQueryString(params: Record<string, any>): string {
      const queryParams = new URLSearchParams();

      for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null) {
          queryParams.append(key, String(value));
        }
      }

      return queryParams.toString();
    }

    /**
     * Build PostgREST filter string
     */
    function buildFilters(filters: Record<string, any>): string {
      const filterParts: string[] = [];

      for (const [key, value] of Object.entries(filters)) {
        if (typeof value === 'object' && value !== null) {
          // Handle complex operators like {eq: 'value'}, {gt: 5}, etc.
          for (const [op, val] of Object.entries(value)) {
            filterParts.push(`${key}=${op}.${val}`);
          }
        } else {
          // Simple equality
          filterParts.push(`${key}=eq.${value}`);
        }
      }

      return filterParts.join('&');
    }

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Resource: Table Row
     * Access a specific row from a table by its ID
     */
    server.registerResource(
      'table-row',
      new ResourceTemplate('supabase://{projectId}/table/{tableName}/row/{rowId}', {
        list: undefined
      }),
      {
        title: 'Table Row',
        description: 'Access a specific row from a table by its ID'
      },
      async (uri, { tableName, rowId }) => {
        const url = `${getRestUrl()}/${tableName}?id=eq.${rowId}`;
        const data = await makeRequest(url, 'GET');

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Table Schema
     * Get the schema/structure of a specific table
     */
    server.registerResource(
      'table-schema',
      new ResourceTemplate('supabase://{projectId}/table/{tableName}/schema', {
        list: undefined
      }),
      {
        title: 'Table Schema',
        description: 'Get the schema/structure of a specific table'
      },
      async (uri, { tableName }) => {
        const url = `${getRestUrl()}/${tableName}?limit=0`;
        const response = await fetch(url, {
          method: 'HEAD',
          headers: getHeaders()
        });

        const contentRange = response.headers.get('content-range');
        const acceptPost = response.headers.get('accept-post');

        const schema = {
          tableName,
          contentRange,
          availableOperations: acceptPost,
          status: response.status
        };

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(schema, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Storage Bucket
     * Get information about a specific storage bucket
     */
    server.registerResource(
      'storage-bucket',
      new ResourceTemplate('supabase://{projectId}/storage/bucket/{bucketName}', {
        list: undefined
      }),
      {
        title: 'Storage Bucket',
        description: 'Get information about a specific storage bucket'
      },
      async (uri, { bucketName }) => {
        const url = `${getStorageUrl()}/bucket/${bucketName}`;
        const data = await makeRequest(url, 'GET');

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Storage Object
     * Access a specific file/object in a storage bucket
     */
    server.registerResource(
      'storage-object',
      new ResourceTemplate(
        'supabase://{projectId}/storage/bucket/{bucketName}/object/{objectPath}',
        { list: undefined }
      ),
      {
        title: 'Storage Object',
        description: 'Access a specific file/object in a storage bucket'
      },
      async (uri, { bucketName, objectPath }) => {
        const url = `${getStorageUrl()}/object/${bucketName}/${objectPath}`;
        const response = await fetch(url, { headers: getHeaders() });

        if (!response.ok) {
          throw new Error(`Failed to fetch object: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const isText = contentType.includes('text') || contentType.includes('json');

        if (isText) {
          const text = await response.text();
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: contentType,
                text
              }
            ]
          };
        } else {
          const buffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: contentType,
                blob: base64
              }
            ]
          };
        }
      }
    );

    /**
     * Resource: User
     * Get information about a specific authenticated user
     */
    server.registerResource(
      'auth-user',
      new ResourceTemplate('supabase://{projectId}/auth/user/{userId}', { list: undefined }),
      {
        title: 'Auth User',
        description: 'Get information about a specific authenticated user'
      },
      async (uri, { userId }) => {
        const url = `${getAuthUrl()}/users/${userId}`;
        const data = await makeRequest(url, 'GET');

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // DATABASE TOOLS
    // ============================================================================

    /**
     * Tool: List Tables
     * Lists all tables available in the database
     */
    server.registerTool(
      'list_tables',
      {
        title: 'List Tables',
        description: 'List all tables in the database',
        inputSchema: {}
      },
      async () => {
        // PostgREST doesn't have a direct endpoint for listing tables
        // We use the root endpoint which returns available tables
        const url = getRestUrl();
        const response = await fetch(url, {
          method: 'GET',
          headers: getHeaders()
        });

        const data = await response.json();

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Query Table
     * Query a table with filtering, sorting, and pagination
     */
    server.registerTool(
      'query_table',
      {
        title: 'Query Table',
        description: 'Query a table with filtering, sorting, and pagination',
        inputSchema: {
          tableName: z.string().describe('Name of the table to query'),
          select: z.string().optional().describe('Columns to select (default: *)'),
          filters: z.record(z.any()).optional().describe('Filters as key-value pairs'),
          order: z.string().optional().describe('Column to order by'),
          ascending: z.boolean().optional().default(true).describe('Sort direction'),
          limit: z.number().optional().describe('Maximum number of rows to return'),
          offset: z.number().optional().describe('Number of rows to skip')
        }
      },
      async ({ tableName, select, filters, order, ascending, limit, offset }) => {
        let url = `${getRestUrl()}/${tableName}`;
        const params: string[] = [];

        if (select) {
          params.push(`select=${select}`);
        }

        if (filters && Object.keys(filters).length > 0) {
          params.push(buildFilters(filters));
        }

        if (order) {
          params.push(`order=${order}.${ascending ? 'asc' : 'desc'}`);
        }

        if (limit !== undefined) {
          params.push(`limit=${limit}`);
        }

        if (offset !== undefined) {
          params.push(`offset=${offset}`);
        }

        if (params.length > 0) {
          url += '?' + params.join('&');
        }

        const data = await makeRequest(url, 'GET');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Insert Rows
     * Insert one or more rows into a table
     */
    server.registerTool(
      'insert_rows',
      {
        title: 'Insert Rows',
        description: 'Insert one or more rows into a table',
        inputSchema: {
          tableName: z.string().describe('Name of the table'),
          data: z.array(z.record(z.any())).describe('Array of objects to insert')
        }
      },
      async ({ tableName, data }) => {
        const url = `${getRestUrl()}/${tableName}`;
        const result = await makeRequest(url, 'POST', data);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully inserted ${
                Array.isArray(result) ? result.length : 1
              } row(s):\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Update Rows
     * Update rows in a table matching filters
     */
    server.registerTool(
      'update_rows',
      {
        title: 'Update Rows',
        description: 'Update rows in a table matching filters',
        inputSchema: {
          tableName: z.string().describe('Name of the table'),
          filters: z.record(z.any()).describe('Filters to match rows to update'),
          data: z.record(z.any()).describe('Object with fields to update')
        }
      },
      async ({ tableName, filters, data }) => {
        const filterString = buildFilters(filters);
        const url = `${getRestUrl()}/${tableName}?${filterString}`;
        const result = await makeRequest(url, 'PATCH', data);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated rows:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Delete Rows
     * Delete rows from a table matching filters
     */
    server.registerTool(
      'delete_rows',
      {
        title: 'Delete Rows',
        description: 'Delete rows from a table matching filters',
        inputSchema: {
          tableName: z.string().describe('Name of the table'),
          filters: z.record(z.any()).describe('Filters to match rows to delete')
        }
      },
      async ({ tableName, filters }) => {
        const filterString = buildFilters(filters);
        const url = `${getRestUrl()}/${tableName}?${filterString}`;
        const result = await makeRequest(url, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted rows:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Upsert Rows
     * Insert or update rows (on conflict)
     */
    server.registerTool(
      'upsert_rows',
      {
        title: 'Upsert Rows',
        description: 'Insert or update rows (on conflict)',
        inputSchema: {
          tableName: z.string().describe('Name of the table'),
          data: z.array(z.record(z.any())).describe('Array of objects to upsert'),
          onConflict: z
            .string()
            .optional()
            .describe('Columns to check for conflict (comma-separated)')
        }
      },
      async ({ tableName, data, onConflict }) => {
        let url = `${getRestUrl()}/${tableName}`;
        const headers = { ...getHeaders() };

        if (onConflict) {
          headers['Prefer'] = `resolution=merge-duplicates`;
          url += `?on_conflict=${onConflict}`;
        } else {
          headers['Prefer'] = `resolution=merge-duplicates`;
        }

        const result = await makeRequest(url, 'POST', data, headers);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully upserted rows:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // AUTHENTICATION TOOLS
    // ============================================================================

    /**
     * Tool: List Users
     * List all users (admin operation)
     */
    server.registerTool(
      'list_users',
      {
        title: 'List Users',
        description: 'List all users (admin operation)',
        inputSchema: {
          page: z.number().optional().default(1).describe('Page number for pagination'),
          perPage: z.number().optional().default(50).describe('Number of users per page')
        }
      },
      async ({ page, perPage }) => {
        const url = `${getAuthUrl()}/users?page=${page}&per_page=${perPage}`;
        const data = await makeRequest(url, 'GET');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Create User
     * Create a new user (admin operation)
     */
    server.registerTool(
      'create_user',
      {
        title: 'Create User',
        description: 'Create a new user (admin operation)',
        inputSchema: {
          email: z.string().email().describe('User email'),
          password: z.string().describe('User password'),
          emailConfirm: z
            .boolean()
            .optional()
            .default(false)
            .describe('Whether email is confirmed'),
          metadata: z.record(z.any()).optional().describe('User metadata object')
        }
      },
      async ({ email, password, emailConfirm, metadata }) => {
        const url = `${getAuthUrl()}/users`;
        const body: any = {
          email,
          password,
          email_confirm: emailConfirm
        };

        if (metadata) {
          body.user_metadata = metadata;
        }

        const result = await makeRequest(url, 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully created user:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Update User
     * Update user information (admin operation)
     */
    server.registerTool(
      'update_user',
      {
        title: 'Update User',
        description: 'Update user information (admin operation)',
        inputSchema: {
          userId: z.string().describe('User ID'),
          email: z.string().email().optional().describe('New email'),
          password: z.string().optional().describe('New password'),
          metadata: z.record(z.any()).optional().describe('User metadata to update')
        }
      },
      async ({ userId, email, password, metadata }) => {
        const url = `${getAuthUrl()}/users/${userId}`;
        const body: any = {};

        if (email) body.email = email;
        if (password) body.password = password;
        if (metadata) body.user_metadata = metadata;

        const result = await makeRequest(url, 'PUT', body);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully updated user:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Delete User
     * Delete a user (admin operation)
     */
    server.registerTool(
      'delete_user',
      {
        title: 'Delete User',
        description: 'Delete a user (admin operation)',
        inputSchema: {
          userId: z.string().describe('User ID')
        }
      },
      async ({ userId }) => {
        const url = `${getAuthUrl()}/users/${userId}`;
        await makeRequest(url, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted user with ID: ${userId}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // STORAGE TOOLS
    // ============================================================================

    /**
     * Tool: List Buckets
     * List all storage buckets
     */
    server.registerTool(
      'list_buckets',
      {
        title: 'List Buckets',
        description: 'List all storage buckets',
        inputSchema: {}
      },
      async () => {
        const url = `${getStorageUrl()}/bucket`;
        const data = await makeRequest(url, 'GET');

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Create Bucket
     * Create a new storage bucket
     */
    server.registerTool(
      'create_bucket',
      {
        title: 'Create Bucket',
        description: 'Create a new storage bucket',
        inputSchema: {
          name: z.string().describe('Bucket name'),
          public: z.boolean().optional().default(false).describe('Whether bucket is public'),
          fileSizeLimit: z.number().optional().describe('Maximum file size in bytes'),
          allowedMimeTypes: z
            .array(z.string())
            .optional()
            .describe('Array of allowed MIME types')
        }
      },
      async ({ name, public: isPublic, fileSizeLimit, allowedMimeTypes }) => {
        const url = `${getStorageUrl()}/bucket`;
        const body: any = {
          name,
          public: isPublic
        };

        if (fileSizeLimit !== undefined) {
          body.file_size_limit = fileSizeLimit;
        }

        if (allowedMimeTypes) {
          body.allowed_mime_types = allowedMimeTypes;
        }

        const result = await makeRequest(url, 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully created bucket:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Delete Bucket
     * Delete a storage bucket
     */
    server.registerTool(
      'delete_bucket',
      {
        title: 'Delete Bucket',
        description: 'Delete a storage bucket',
        inputSchema: {
          bucketName: z.string().describe('Name of the bucket')
        }
      },
      async ({ bucketName }) => {
        const url = `${getStorageUrl()}/bucket/${bucketName}`;
        await makeRequest(url, 'DELETE');

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted bucket: ${bucketName}`
            }
          ]
        };
      }
    );

    /**
     * Tool: List Objects
     * List objects in a storage bucket
     */
    server.registerTool(
      'list_objects',
      {
        title: 'List Objects',
        description: 'List objects in a storage bucket',
        inputSchema: {
          bucketName: z.string().describe('Name of the bucket'),
          path: z.string().optional().default('').describe('Path prefix to filter objects'),
          limit: z
            .number()
            .optional()
            .default(100)
            .describe('Maximum number of objects to return'),
          offset: z.number().optional().default(0).describe('Number of objects to skip')
        }
      },
      async ({ bucketName, path, limit, offset }) => {
        const url = `${getStorageUrl()}/object/list/${bucketName}`;
        const body = {
          prefix: path,
          limit,
          offset
        };

        const data = await makeRequest(url, 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(data, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Upload Object
     * Upload a file to storage
     */
    server.registerTool(
      'upload_object',
      {
        title: 'Upload Object',
        description: 'Upload a file to storage',
        inputSchema: {
          bucketName: z.string().describe('Name of the bucket'),
          path: z.string().describe('Path where to store the file'),
          content: z
            .string()
            .describe('File content (base64 encoded for binary, plain text otherwise)'),
          contentType: z
            .string()
            .optional()
            .default('application/octet-stream')
            .describe('MIME type of the file'),
          upsert: z
            .boolean()
            .optional()
            .default(false)
            .describe('Whether to overwrite existing file')
        }
      },
      async ({ bucketName, path, content, contentType, upsert }) => {
        const url = `${getStorageUrl()}/object/${bucketName}/${path}`;

        // Decode base64 if it looks like base64
        let bodyContent: string | Uint8Array = content;
        try {
          // Try to decode as base64
          const decoded = atob(content);
          const bytes = new Uint8Array(decoded.length);
          for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
          }
          bodyContent = bytes;
        } catch {
          // Not base64, use as-is
          bodyContent = content;
        }

        const headers: Record<string, string> = {
          apikey: config.token,
          Authorization: `Bearer ${config.token}`,
          'Content-Type': contentType
        };

        if (upsert) {
          headers['x-upsert'] = 'true';
        }

        const response = await fetch(url, {
          method: 'POST',
          headers,
          body: bodyContent
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${errorText}`);
        }

        const result = await response.json();

        return {
          content: [
            {
              type: 'text',
              text: `Successfully uploaded file:\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Download Object
     * Download a file from storage
     */
    server.registerTool(
      'download_object',
      {
        title: 'Download Object',
        description: 'Download a file from storage',
        inputSchema: {
          bucketName: z.string().describe('Name of the bucket'),
          path: z.string().describe('Path to the file')
        }
      },
      async ({ bucketName, path }) => {
        const url = `${getStorageUrl()}/object/${bucketName}/${path}`;
        const response = await fetch(url, { headers: getHeaders() });

        if (!response.ok) {
          throw new Error(`Download failed: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const isText =
          contentType.includes('text') ||
          contentType.includes('json') ||
          contentType.includes('xml');

        if (isText) {
          const text = await response.text();
          return {
            content: [
              {
                type: 'text',
                text: `File content (${contentType}):\n${text}`
              }
            ]
          };
        } else {
          const buffer = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));
          return {
            content: [
              {
                type: 'text',
                text: `Binary file downloaded (${contentType}). Base64 content:\n${base64.substring(
                  0,
                  100
                )}... (truncated)`
              }
            ]
          };
        }
      }
    );

    /**
     * Tool: Delete Object
     * Delete a file from storage
     */
    server.registerTool(
      'delete_object',
      {
        title: 'Delete Object',
        description: 'Delete files from storage',
        inputSchema: {
          bucketName: z.string().describe('Name of the bucket'),
          paths: z.array(z.string()).describe('Array of file paths to delete')
        }
      },
      async ({ bucketName, paths }) => {
        const url = `${getStorageUrl()}/object/${bucketName}`;
        const body = { prefixes: paths };

        const result = await makeRequest(url, 'DELETE', body);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully deleted ${paths.length} file(s):\n${JSON.stringify(
                result,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Move Object
     * Move or rename an object in storage
     */
    server.registerTool(
      'move_object',
      {
        title: 'Move Object',
        description: 'Move or rename an object in storage',
        inputSchema: {
          bucketName: z.string().describe('Name of the bucket'),
          fromPath: z.string().describe('Current path'),
          toPath: z.string().describe('New path')
        }
      },
      async ({ bucketName, fromPath, toPath }) => {
        const url = `${getStorageUrl()}/object/move`;
        const body = {
          bucketId: bucketName,
          sourceKey: fromPath,
          destinationKey: toPath
        };

        const result = await makeRequest(url, 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Successfully moved object from ${fromPath} to ${toPath}:\n${JSON.stringify(
                result,
                null,
                2
              )}`
            }
          ]
        };
      }
    );
  }
);
