import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Google Sheets MCP Server
 * Provides tools and resources for interacting with Google Sheets API
 */

// Helper to generate PKCE code verifier and challenge
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  // @ts-ignore
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  // @ts-ignore
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

metorial.setOauthHandler({
  getAuthForm: () => ({
    fields: []
  }),
  getAuthorizationUrl: async input => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const scopes = [
      'https://www.googleapis.com/auth/spreadsheets',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      scope: scopes,
      state: input.state,
      access_type: 'offline',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      authorizationUrl: `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      codeVerifier: codeVerifier
    };
  },
  handleCallback: async input => {
    try {
      const url = new URL(input.fullUrl);
      const code = url.searchParams.get('code');

      if (!code) {
        throw new Error('No authorization code received');
      }

      const tokenParams = new URLSearchParams({
        code: code,
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri,
        grant_type: 'authorization_code',
        code_verifier: input.codeVerifier!
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = (await tokenResponse.json()) as any;

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  refreshAccessToken: async input => {
    try {
      const tokenParams = new URLSearchParams({
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken,
        grant_type: 'refresh_token'
      });

      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token refresh failed: ${errorText}`);
      }

      const tokenData = (await tokenResponse.json()) as any;

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || input.refreshToken,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
});

interface Config {
  token: string;
}

metorial.createServer<Config>(
  {
    name: 'google-sheets-server',
    version: '1.0.0'
  },
  async (server, config) => {
    const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

    /**
     * Helper function to make authenticated requests to Google Sheets API
     */
    async function sheetsRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const url = endpoint.startsWith('http') ? endpoint : `${SHEETS_API_BASE}${endpoint}`;

      const response = await fetch(url, {
        ...options,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          ...options.headers
        }
      });

      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Google Sheets API error: ${response.status} - ${error}`);
      }

      return response.json() as Promise<T>;
    }

    /**
     * Format spreadsheet metadata for readable output
     */
    function formatSpreadsheet(spreadsheet: any): string {
      const lines = [
        `Spreadsheet: ${spreadsheet.properties.title}`,
        `ID: ${spreadsheet.spreadsheetId}`,
        `URL: ${spreadsheet.spreadsheetUrl}`
      ];

      if (spreadsheet.sheets && spreadsheet.sheets.length > 0) {
        lines.push(`\nSheets (${spreadsheet.sheets.length}):`);
        spreadsheet.sheets.forEach((sheet: any) => {
          lines.push(`  - ${sheet.properties.title} (${sheet.properties.sheetId})`);
        });
      }

      return lines.join('\n');
    }

    // ============================================================================
    // SPREADSHEET TOOLS
    // ============================================================================

    /**
     * Tool: list_spreadsheets
     * List spreadsheets from Google Drive
     */
    server.registerTool(
      'list_spreadsheets',
      {
        title: 'List Spreadsheets',
        description: 'List Google Sheets spreadsheets from Drive',
        inputSchema: {
          pageSize: z
            .number()
            .min(1)
            .max(1000)
            .default(100)
            .optional()
            .describe('Maximum number of spreadsheets to return (1-1000)'),
          query: z.string().optional().describe('Additional query to filter spreadsheets')
        }
      },
      async ({ pageSize = 100, query }) => {
        let q = "mimeType='application/vnd.google-apps.spreadsheet' and trashed=false";

        if (query) {
          q = `${q} and ${query}`;
        }

        const params = new URLSearchParams({
          q,
          pageSize: String(pageSize),
          fields: 'files(id,name,createdTime,modifiedTime,owners,webViewLink)'
        });

        // Use Drive API to list spreadsheets
        const response = await fetch(
          `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
          {
            headers: {
              Authorization: `Bearer ${config.token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Google Drive API error: ${response.status} - ${error}`);
        }

        const result: any = await response.json();

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result.files, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: create_spreadsheet
     * Create a new spreadsheet
     */
    server.registerTool(
      'create_spreadsheet',
      {
        title: 'Create Spreadsheet',
        description: 'Create a new Google Sheets spreadsheet',
        inputSchema: {
          title: z.string().describe('Title of the spreadsheet'),
          sheetTitles: z
            .array(z.string())
            .optional()
            .describe('Titles for initial sheets (default: one sheet named "Sheet1")')
        }
      },
      async ({ title, sheetTitles }) => {
        const sheets = sheetTitles
          ? sheetTitles.map(sheetTitle => ({
              properties: { title: sheetTitle }
            }))
          : [{ properties: { title: 'Sheet1' } }];

        const result = await sheetsRequest<any>('', {
          method: 'POST',
          body: JSON.stringify({
            properties: { title },
            sheets
          })
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: formatSpreadsheet(result)
            }
          ]
        };
      }
    );

    /**
     * Tool: get_spreadsheet
     * Get spreadsheet metadata
     */
    server.registerTool(
      'get_spreadsheet',
      {
        title: 'Get Spreadsheet',
        description: 'Get metadata about a spreadsheet',
        inputSchema: {
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          includeGridData: z
            .boolean()
            .optional()
            .describe('Include cell data (default: false)')
        }
      },
      async ({ spreadsheetId, includeGridData = false }) => {
        const params = includeGridData ? '?includeGridData=true' : '';
        const result = await sheetsRequest<any>(`/${spreadsheetId}${params}`);

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: update_spreadsheet_properties
     * Update spreadsheet properties
     */
    server.registerTool(
      'update_spreadsheet_properties',
      {
        title: 'Update Spreadsheet Properties',
        description: 'Update spreadsheet properties like title',
        inputSchema: {
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          title: z.string().optional().describe('New title for the spreadsheet')
        }
      },
      async ({ spreadsheetId, title }) => {
        const requests = [];

        if (title) {
          requests.push({
            updateSpreadsheetProperties: {
              properties: { title },
              fields: 'title'
            }
          });
        }

        const result = await sheetsRequest<any>(`/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({ requests })
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // SHEET MANAGEMENT TOOLS
    // ============================================================================

    /**
     * Tool: add_sheet
     * Add a new sheet to a spreadsheet
     */
    server.registerTool(
      'add_sheet',
      {
        title: 'Add Sheet',
        description: 'Add a new sheet to an existing spreadsheet',
        inputSchema: {
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          title: z.string().describe('Title for the new sheet'),
          index: z.number().optional().describe('Position index for the new sheet'),
          gridRows: z.number().optional().describe('Number of rows (default: 1000)'),
          gridColumns: z.number().optional().describe('Number of columns (default: 26)')
        }
      },
      async ({ spreadsheetId, title, index, gridRows, gridColumns }) => {
        const properties: any = { title };
        if (index !== undefined) properties.index = index;

        const gridProperties: any = {};
        if (gridRows) gridProperties.rowCount = gridRows;
        if (gridColumns) gridProperties.columnCount = gridColumns;

        if (Object.keys(gridProperties).length > 0) {
          properties.gridProperties = gridProperties;
        }

        const result = await sheetsRequest<any>(`/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                addSheet: { properties }
              }
            ]
          })
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: delete_sheet
     * Delete a sheet from a spreadsheet
     */
    server.registerTool(
      'delete_sheet',
      {
        title: 'Delete Sheet',
        description: 'Delete a sheet from a spreadsheet',
        inputSchema: {
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          sheetId: z.number().describe('Sheet ID (not the title)')
        }
      },
      async ({ spreadsheetId, sheetId }) => {
        const result = await sheetsRequest<any>(`/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({
            requests: [
              {
                deleteSheet: { sheetId }
              }
            ]
          })
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: duplicate_sheet
     * Duplicate a sheet
     */
    server.registerTool(
      'duplicate_sheet',
      {
        title: 'Duplicate Sheet',
        description: 'Create a copy of a sheet within the same spreadsheet',
        inputSchema: {
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          sourceSheetId: z.number().describe('Sheet ID to duplicate'),
          newSheetName: z.string().optional().describe('Name for the duplicated sheet')
        }
      },
      async ({ spreadsheetId, sourceSheetId, newSheetName }) => {
        const request: any = {
          duplicateSheet: {
            sourceSheetId,
            newSheetName
          }
        };

        const result = await sheetsRequest<any>(`/${spreadsheetId}:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({ requests: [request] })
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // DATA READING TOOLS
    // ============================================================================

    /**
     * Tool: batch_get_values
     * Get values from multiple ranges
     */
    server.registerTool(
      'batch_get_values',
      {
        title: 'Batch Get Values',
        description: 'Get cell values from multiple ranges at once',
        inputSchema: {
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          ranges: z.array(z.string()).describe('Array of ranges in A1 notation'),
          majorDimension: z
            .enum(['ROWS', 'COLUMNS'])
            .optional()
            .describe('Major dimension for the values')
        }
      },
      async ({ spreadsheetId, ranges, majorDimension }) => {
        const params = new URLSearchParams();
        ranges.forEach(range => params.append('ranges', range));
        if (majorDimension) params.append('majorDimension', majorDimension);

        const result = await sheetsRequest<any>(
          `/${spreadsheetId}/values:batchGet?${params.toString()}`
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // DATA WRITING TOOLS
    // ============================================================================

    /**
     * Tool: batch_update_values
     * Update multiple ranges at once
     */
    server.registerTool(
      'batch_update_values',
      {
        title: 'Batch Update Values',
        description: 'Update multiple ranges of cells at once',
        inputSchema: {
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          data: z
            .array(
              z.object({
                range: z.string(),
                values: z.array(z.array(z.any()))
              })
            )
            .describe('Array of range-values pairs'),
          valueInputOption: z
            .enum(['RAW', 'USER_ENTERED'])
            .optional()
            .describe('How to interpret input (default: USER_ENTERED)')
        }
      },
      async ({ spreadsheetId, data, valueInputOption = 'USER_ENTERED' }) => {
        const result = await sheetsRequest<any>(`/${spreadsheetId}/values:batchUpdate`, {
          method: 'POST',
          body: JSON.stringify({
            valueInputOption,
            data
          })
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: batch_clear_values
     * Clear multiple ranges at once
     */
    server.registerTool(
      'batch_clear_values',
      {
        title: 'Batch Clear Values',
        description: 'Clear values from multiple ranges at once',
        inputSchema: {
          spreadsheetId: z.string().describe('Spreadsheet ID'),
          ranges: z.array(z.string()).describe('Array of ranges to clear')
        }
      },
      async ({ spreadsheetId, ranges }) => {
        const result = await sheetsRequest<any>(`/${spreadsheetId}/values:batchClear`, {
          method: 'POST',
          body: JSON.stringify({ ranges })
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Resource: Spreadsheet Metadata
     */
    server.registerResource(
      'spreadsheet-metadata',
      new ResourceTemplate('sheets://spreadsheet/{spreadsheetId}', { list: undefined }),
      {
        title: 'Spreadsheet Metadata',
        description: 'Access metadata for a specific spreadsheet'
      },
      async (uri, { spreadsheetId }) => {
        const spreadsheet = await sheetsRequest<any>(`/${spreadsheetId}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: formatSpreadsheet(spreadsheet)
            }
          ]
        };
      }
    );

    /**
     * Resource: Sheet Values
     */
    server.registerResource(
      'sheet-values',
      new ResourceTemplate('sheets://spreadsheet/{spreadsheetId}/values/{range}', {
        list: undefined
      }),
      {
        title: 'Sheet Values',
        description: 'Access values from a specific range in a spreadsheet'
      },
      async (uri, { spreadsheetId, range }) => {
        const result = await sheetsRequest<any>(
          `/${spreadsheetId}/values/${encodeURIComponent(range as string)}`
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );
  }
);
