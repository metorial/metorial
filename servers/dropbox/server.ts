import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Dropbox MCP Server
 * Provides tools and resources for interacting with Dropbox API
 */

interface Config {
  token: string;
}

metorial.setOauthHandler({
  getAuthForm: () => ({
    fields: []
  }),
  getAuthorizationUrl: async input => {
    const params = new URLSearchParams({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      response_type: 'code',
      state: input.state,
      token_access_type: 'offline', // Request refresh token
      force_reapprove: 'false'
    });

    return {
      authorizationUrl: `https://www.dropbox.com/oauth2/authorize?${params.toString()}`
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
        grant_type: 'authorization_code',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        redirect_uri: input.redirectUri
      });

      const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
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
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token,
        scope: tokenData.scope,
        uid: tokenData.uid,
        account_id: tokenData.account_id
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  },
  refreshAccessToken: async input => {
    try {
      const tokenParams = new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: input.refreshToken,
        client_id: input.clientId,
        client_secret: input.clientSecret
      });

      const tokenResponse = await fetch('https://api.dropboxapi.com/oauth2/token', {
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
        token_type: tokenData.token_type,
        expires_in: tokenData.expires_in,
        refresh_token: tokenData.refresh_token || input.refreshToken,
        scope: tokenData.scope,
        uid: tokenData.uid,
        account_id: tokenData.account_id
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
});

metorial.createServer<Config>(
  {
    name: 'dropbox-mcp-server',
    version: '1.0.0'
  },
  async (server, cfg) => {
    // Base Dropbox API URLs
    const DROPBOX_API_BASE = 'https://api.dropboxapi.com/2';
    const DROPBOX_CONTENT_BASE = 'https://content.dropboxapi.com/2';

    /**
     * Helper function to make Dropbox API requests
     */
    async function dropboxRequest(
      endpoint: string,
      method: string = 'POST',
      body?: any,
      isContentEndpoint: boolean = false
    ): Promise<any> {
      const baseUrl = isContentEndpoint ? DROPBOX_CONTENT_BASE : DROPBOX_API_BASE;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${cfg.token}`
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body) {
        if (isContentEndpoint && typeof body === 'string') {
          // For content uploads
          headers['Content-Type'] = 'application/octet-stream';
          options.body = body;
        } else {
          headers['Content-Type'] = 'application/json';
          options.body = JSON.stringify(body);
        }
      }

      const response = await fetch(`${baseUrl}${endpoint}`, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Dropbox API Error (${response.status}): ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    }

    // ============================================================================
    // FILE & FOLDER MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'list_folder',
      {
        title: 'List Folder',
        description: 'List contents of a folder',
        inputSchema: {
          path: z.string().describe('Path to the folder (use empty string for root)'),
          recursive: z.boolean().optional().describe('List all subfolders recursively'),
          include_deleted: z.boolean().optional().describe('Include deleted files/folders'),
          limit: z.number().optional().describe('Maximum number of results (default 2000)')
        }
      },
      async ({ path, recursive, include_deleted, limit }) => {
        const body: any = {
          path: path || '',
          recursive: recursive || false,
          include_deleted: include_deleted || false
        };
        if (limit) body.limit = limit;

        const result = await dropboxRequest('/files/list_folder', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'get_metadata',
      {
        title: 'Get Metadata',
        description: 'Get metadata for a file or folder',
        inputSchema: {
          path: z.string().describe('Path to the file or folder'),
          include_deleted: z.boolean().optional().describe('Include deleted files/folders')
        }
      },
      async ({ path, include_deleted }) => {
        const body: any = {
          path,
          include_deleted: include_deleted || false
        };

        const result = await dropboxRequest('/files/get_metadata', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'search',
      {
        title: 'Search Files',
        description: 'Search for files and folders',
        inputSchema: {
          query: z.string().describe('Search query'),
          path: z
            .string()
            .optional()
            .describe('Path to search within (default: entire Dropbox)'),
          max_results: z
            .number()
            .optional()
            .describe('Maximum results to return (1-1000, default 100)')
        }
      },
      async ({ query, path, max_results }) => {
        const body: any = {
          query,
          options: {
            path: path || '',
            max_results: max_results || 100
          }
        };

        const result = await dropboxRequest('/files/search_v2', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_folder',
      {
        title: 'Create Folder',
        description: 'Create a new folder',
        inputSchema: {
          path: z.string().describe('Path for the new folder'),
          autorename: z.boolean().optional().describe('Auto-rename if conflict exists')
        }
      },
      async ({ path, autorename }) => {
        const body: any = {
          path,
          autorename: autorename || false
        };

        const result = await dropboxRequest('/files/create_folder_v2', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Folder created successfully: ${
                result.metadata.path_display
              }\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete',
      {
        title: 'Delete File/Folder',
        description: 'Delete a file or folder',
        inputSchema: {
          path: z.string().describe('Path to the file or folder to delete')
        }
      },
      async ({ path }) => {
        const body = { path };

        const result = await dropboxRequest('/files/delete_v2', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Deleted successfully: ${result.metadata.path_display}\n\n${JSON.stringify(
                result,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'move',
      {
        title: 'Move File/Folder',
        description: 'Move a file or folder to a different location',
        inputSchema: {
          from_path: z.string().describe('Source path'),
          to_path: z.string().describe('Destination path'),
          autorename: z.boolean().optional().describe('Auto-rename if conflict exists'),
          allow_ownership_transfer: z
            .boolean()
            .optional()
            .describe('Allow ownership transfer for shared folders')
        }
      },
      async ({ from_path, to_path, autorename, allow_ownership_transfer }) => {
        const body: any = {
          from_path,
          to_path,
          autorename: autorename || false,
          allow_ownership_transfer: allow_ownership_transfer || false
        };

        const result = await dropboxRequest('/files/move_v2', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Moved successfully to: ${
                result.metadata.path_display
              }\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'copy',
      {
        title: 'Copy File/Folder',
        description: 'Copy a file or folder to a different location',
        inputSchema: {
          from_path: z.string().describe('Source path'),
          to_path: z.string().describe('Destination path'),
          autorename: z.boolean().optional().describe('Auto-rename if conflict exists')
        }
      },
      async ({ from_path, to_path, autorename }) => {
        const body: any = {
          from_path,
          to_path,
          autorename: autorename || false
        };

        const result = await dropboxRequest('/files/copy_v2', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Copied successfully to: ${
                result.metadata.path_display
              }\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'download_file',
      {
        title: 'Download File',
        description: 'Download a file from Dropbox',
        inputSchema: {
          path: z.string().describe('Path to the file to download')
        }
      },
      async ({ path }) => {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${cfg.token}`,
          'Dropbox-API-Arg': JSON.stringify({ path })
        };

        const response = await fetch(`${DROPBOX_CONTENT_BASE}/files/download`, {
          method: 'POST',
          headers
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Download failed: ${errorText}`);
        }

        const content = await response.text();
        const metadata = JSON.parse(response.headers.get('dropbox-api-result') || '{}');

        return {
          content: [
            {
              type: 'text',
              text: `File downloaded: ${metadata.name}\n\nContent:\n${content.substring(
                0,
                5000
              )}${content.length > 5000 ? '...(truncated)' : ''}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'upload_file',
      {
        title: 'Upload File',
        description: 'Upload a file to Dropbox',
        inputSchema: {
          path: z.string().describe('Destination path for the file'),
          content: z.string().describe('File content'),
          mode: z
            .enum(['add', 'overwrite', 'update'])
            .optional()
            .describe('Write mode (default: add)'),
          autorename: z.boolean().optional().describe('Auto-rename if conflict exists')
        }
      },
      async ({ path, content, mode, autorename }) => {
        const headers: Record<string, string> = {
          Authorization: `Bearer ${cfg.token}`,
          'Content-Type': 'application/octet-stream',
          'Dropbox-API-Arg': JSON.stringify({
            path,
            mode: mode || 'add',
            autorename: autorename || false
          })
        };

        const response = await fetch(`${DROPBOX_CONTENT_BASE}/files/upload`, {
          method: 'POST',
          headers,
          body: content
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Upload failed: ${errorText}`);
        }

        const result: any = await response.json();

        return {
          content: [
            {
              type: 'text',
              text: `File uploaded successfully: ${result.path_display}\n\n${JSON.stringify(
                result,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // SHARING TOOLS
    // ============================================================================

    server.registerTool(
      'create_shared_link',
      {
        title: 'Create Shared Link',
        description: 'Create a shared link for a file or folder',
        inputSchema: {
          path: z.string().describe('Path to the file or folder'),
          settings: z
            .object({
              access: z.enum(['viewer', 'editor']).optional().describe('Access level'),
              allow_download: z.boolean().optional().describe('Allow downloads'),
              audience: z
                .enum(['public', 'team', 'no_one'])
                .optional()
                .describe('Link audience'),
              requested_visibility: z
                .enum(['public', 'team_only', 'password'])
                .optional()
                .describe('Link visibility')
            })
            .optional()
            .describe('Link settings')
        }
      },
      async ({ path, settings }) => {
        const body: any = { path };
        if (settings) body.settings = settings;

        const result = await dropboxRequest(
          '/sharing/create_shared_link_with_settings',
          'POST',
          body
        );

        return {
          content: [
            {
              type: 'text',
              text: `Shared link created: ${result.url}\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_shared_links',
      {
        title: 'List Shared Links',
        description: 'List shared links for files and folders',
        inputSchema: {
          path: z.string().optional().describe('Filter by path')
        }
      },
      async ({ path }) => {
        const body: any = {};
        if (path) body.path = path;

        const result = await dropboxRequest('/sharing/list_shared_links', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'share_folder',
      {
        title: 'Share Folder',
        description: 'Share a folder with specific members',
        inputSchema: {
          path: z.string().describe('Path to the folder'),
          member_policy: z.enum(['team', 'anyone']).optional().describe('Who can be a member'),
          acl_update_policy: z
            .enum(['owner', 'editors'])
            .optional()
            .describe('Who can add/remove members'),
          shared_link_policy: z
            .enum(['anyone', 'members'])
            .optional()
            .describe('Policy for shared links'),
          force_async: z.boolean().optional().describe('Force asynchronous processing')
        }
      },
      async ({ path, member_policy, acl_update_policy, shared_link_policy, force_async }) => {
        const body: any = { path };
        if (member_policy) body.member_policy = member_policy;
        if (acl_update_policy) body.acl_update_policy = acl_update_policy;
        if (shared_link_policy) body.shared_link_policy = shared_link_policy;
        if (force_async !== undefined) body.force_async = force_async;

        const result = await dropboxRequest('/sharing/share_folder', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Folder shared successfully\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'add_folder_member',
      {
        title: 'Add Folder Member',
        description: 'Add a member to a shared folder',
        inputSchema: {
          shared_folder_id: z.string().describe('Shared folder ID'),
          members: z
            .array(
              z.object({
                member: z.object({
                  email: z.string().describe('Member email address')
                }),
                access_level: z.enum(['viewer', 'editor', 'owner']).describe('Access level')
              })
            )
            .describe('Members to add')
        }
      },
      async ({ shared_folder_id, members }) => {
        const body = {
          shared_folder_id,
          members: members.map(m => ({
            member: { '.tag': 'email', email: m.member.email },
            access_level: { '.tag': m.access_level }
          }))
        };

        const result = await dropboxRequest('/sharing/add_folder_member', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: `Members added successfully\n\n${JSON.stringify(result, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_folders',
      {
        title: 'List Shared Folders',
        description: 'List all shared folders',
        inputSchema: {
          limit: z.number().optional().describe('Maximum results (default 1000)')
        }
      },
      async ({ limit }) => {
        const body: any = {};
        if (limit) body.limit = limit;

        const result = await dropboxRequest('/sharing/list_folders', 'POST', body);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // ACCOUNT & USER TOOLS
    // ============================================================================

    server.registerTool(
      'get_current_account',
      {
        title: 'Get Current Account',
        description: 'Get information about the current user account',
        inputSchema: {}
      },
      async () => {
        const result = await dropboxRequest('/users/get_current_account', 'POST', null);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'get_space_usage',
      {
        title: 'Get Space Usage',
        description: 'Get space usage information for the current account',
        inputSchema: {}
      },
      async () => {
        const result = await dropboxRequest('/users/get_space_usage', 'POST', null);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // RESOURCES
    // ============================================================================

    server.registerResource(
      'file_metadata',
      new ResourceTemplate('dropbox://file/{path}', { list: undefined }),
      {
        title: 'File Metadata',
        description: 'Access detailed metadata about a specific file'
      },
      async (uri, { path }) => {
        const decodedPath = decodeURIComponent(path as string);
        const result = await dropboxRequest('/files/get_metadata', 'POST', {
          path: decodedPath
        });

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

    server.registerResource(
      'folder_contents',
      new ResourceTemplate('dropbox://folder/{path}', { list: undefined }),
      {
        title: 'Folder Contents',
        description: 'Access contents of a specific folder'
      },
      async (uri, { path }) => {
        const decodedPath = decodeURIComponent(path as string);
        const result = await dropboxRequest('/files/list_folder', 'POST', {
          path: decodedPath || ''
        });

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

    server.registerResource(
      'shared_link_info',
      new ResourceTemplate('dropbox://shared/{link_id}', { list: undefined }),
      {
        title: 'Shared Link Info',
        description: 'Access information about a shared link'
      },
      async (uri, { link_id }) => {
        const result = await dropboxRequest('/sharing/list_shared_links', 'POST', {});
        const link = result.links.find((l: any) => l.id === link_id);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(link || { error: 'Link not found' }, null, 2)
            }
          ]
        };
      }
    );

    server.registerResource(
      'account_info',
      new ResourceTemplate('dropbox://account/info', { list: undefined }),
      {
        title: 'Account Information',
        description: 'Access current account information and space usage'
      },
      async uri => {
        const account = await dropboxRequest('/users/get_current_account', 'POST', null);
        const space = await dropboxRequest('/users/get_space_usage', 'POST', null);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify({ account, space }, null, 2)
            }
          ]
        };
      }
    );
  }
);
