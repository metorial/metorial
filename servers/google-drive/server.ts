import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Google Drive MCP Server
 * Provides tools and resources for interacting with Google Drive API
 */

// Helper to generate PKCE code verifier and challenge
function generateCodeVerifier() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

async function generateCodeChallenge(verifier: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
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
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/drive.file',
      'https://www.googleapis.com/auth/drive.metadata.readonly',
      'https://www.googleapis.com/auth/drive'
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
    name: 'google-drive-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Google Drive API base URL
    const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

    /**
     * Helper function to make authenticated requests to Google Drive API
     */
    async function driveRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const url = endpoint.startsWith('http') ? endpoint : `${DRIVE_API_BASE}${endpoint}`;

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
        throw new Error(`Google Drive API error: ${response.status} - ${error}`);
      }

      return response.json() as Promise<T>;
    }

    /**
     * Helper to export Google Docs files to text format
     */
    async function exportFile(fileId: string, mimeType: string): Promise<string> {
      const exportMimeType = getExportMimeType(mimeType);

      if (!exportMimeType) {
        throw new Error(`Cannot export file type: ${mimeType}`);
      }

      const response = await fetch(
        `${DRIVE_API_BASE}/files/${fileId}/export?mimeType=${encodeURIComponent(
          exportMimeType
        )}`,
        {
          headers: {
            Authorization: `Bearer ${config.token}`
          }
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to export file: ${response.status}`);
      }

      return response.text();
    }

    /**
     * Get appropriate export MIME type for Google Workspace files
     */
    function getExportMimeType(mimeType: string): string | null {
      const exportMap: Record<string, string> = {
        'application/vnd.google-apps.document': 'text/plain',
        'application/vnd.google-apps.spreadsheet': 'text/csv',
        'application/vnd.google-apps.presentation': 'text/plain',
        'application/vnd.google-apps.drawing': 'image/png'
      };

      return exportMap[mimeType] || null;
    }

    /**
     * Download file content for regular files
     */
    async function downloadFile(fileId: string): Promise<string> {
      const response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?alt=media`, {
        headers: {
          Authorization: `Bearer ${config.token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to download file: ${response.status}`);
      }

      return response.text();
    }

    // ============================================================================
    // TOOLS
    // ============================================================================

    /**
     * Tool: list_files
     * List files and folders in Google Drive
     */
    server.registerTool(
      'list_files',
      {
        title: 'List Files',
        description:
          'List files and folders in a specific folder or at the root of Google Drive',
        inputSchema: {
          folderId: z
            .string()
            .optional()
            .describe('The ID of the folder to list files from. Omit for root folder.'),
          pageSize: z
            .number()
            .min(1)
            .max(1000)
            .default(100)
            .optional()
            .describe('Maximum number of files to return (1-1000)'),
          query: z
            .string()
            .optional()
            .describe('Query string to filter files (e.g., "name contains \'report\'")')
        }
      },
      async ({ folderId, pageSize = 100, query }) => {
        let q = query || '';

        if (folderId) {
          q = q ? `'${folderId}' in parents and ${q}` : `'${folderId}' in parents`;
        }

        q = q ? `${q} and trashed=false` : 'trashed=false';

        const params = new URLSearchParams({
          q,
          pageSize: String(pageSize),
          fields:
            'files(id,name,mimeType,size,createdTime,modifiedTime,parents,owners,webViewLink)'
        });

        const result = await driveRequest<any>(`/files?${params}`);

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
     * Tool: search_files
     * Search for files across Google Drive
     */
    server.registerTool(
      'search_files',
      {
        title: 'Search Files',
        description: 'Search for files across Google Drive using queries',
        inputSchema: {
          query: z
            .string()
            .describe(
              "Search query (e.g., \"name contains 'report'\" or \"fullText contains 'budget')"
            ),
          mimeType: z
            .string()
            .optional()
            .describe('Filter by MIME type (e.g., "application/pdf")'),
          pageSize: z
            .number()
            .min(1)
            .max(1000)
            .default(100)
            .optional()
            .describe('Maximum number of results (1-1000)')
        }
      },
      async ({ query, mimeType, pageSize = 100 }) => {
        let q = `${query} and trashed=false`;

        if (mimeType) {
          q += ` and mimeType='${mimeType}'`;
        }

        const params = new URLSearchParams({
          q,
          pageSize: String(pageSize),
          fields:
            'files(id,name,mimeType,size,createdTime,modifiedTime,parents,owners,webViewLink)'
        });

        const result = await driveRequest<any>(`/files?${params}`);

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
     * Tool: create_folder
     * Create a new folder in Google Drive
     */
    server.registerTool(
      'create_folder',
      {
        title: 'Create Folder',
        description: 'Create a new folder in Google Drive',
        inputSchema: {
          name: z.string().describe('Name of the folder to create'),
          parentFolderId: z
            .string()
            .optional()
            .describe('Parent folder ID. Omit to create in root.')
        }
      },
      async ({ name, parentFolderId }) => {
        const metadata: any = {
          name,
          mimeType: 'application/vnd.google-apps.folder'
        };

        if (parentFolderId) {
          metadata.parents = [parentFolderId];
        }

        const result = await driveRequest<any>('/files', {
          method: 'POST',
          body: JSON.stringify(metadata)
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
     * Tool: upload_file
     * Upload a file to Google Drive
     */
    server.registerTool(
      'upload_file',
      {
        title: 'Upload File',
        description: 'Upload a new file to Google Drive',
        inputSchema: {
          name: z.string().describe('Name of the file'),
          content: z.string().describe('File content (text or base64 encoded)'),
          mimeType: z.string().default('text/plain').describe('MIME type of the file'),
          parentFolderId: z
            .string()
            .optional()
            .describe('Parent folder ID. Omit to upload to root.')
        }
      },
      async ({ name, content, mimeType, parentFolderId }) => {
        const metadata: any = {
          name,
          mimeType
        };

        if (parentFolderId) {
          metadata.parents = [parentFolderId];
        }

        // Use multipart upload
        const boundary = '-------314159265358979323846';
        const delimiter = `\r\n--${boundary}\r\n`;
        const closeDelimiter = `\r\n--${boundary}--`;

        const multipartRequestBody =
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          `Content-Type: ${mimeType}\r\n\r\n` +
          content +
          closeDelimiter;

        const response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${config.token}`,
              'Content-Type': `multipart/related; boundary=${boundary}`
            },
            body: multipartRequestBody
          }
        );

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`Upload failed: ${response.status} - ${error}`);
        }

        const result = await response.json();

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
     * Tool: delete_file
     * Delete a file or folder from Google Drive
     */
    server.registerTool(
      'delete_file',
      {
        title: 'Delete File',
        description: 'Delete a file or folder from Google Drive',
        inputSchema: {
          fileId: z.string().describe('ID of the file or folder to delete')
        }
      },
      async ({ fileId }) => {
        await fetch(`${DRIVE_API_BASE}/files/${fileId}`, {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${config.token}`
          }
        });

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(
                { success: true, fileId, message: 'File deleted successfully' },
                null,
                2
              )
            }
          ]
        };
      }
    );

    /**
     * Tool: move_file
     * Move a file to a different folder
     */
    server.registerTool(
      'move_file',
      {
        title: 'Move File',
        description: 'Move a file or folder to a different location',
        inputSchema: {
          fileId: z.string().describe('ID of the file to move'),
          newParentFolderId: z.string().describe('ID of the destination folder'),
          removeFromPreviousParents: z
            .boolean()
            .default(true)
            .describe('Remove from all previous parent folders')
        }
      },
      async ({ fileId, newParentFolderId, removeFromPreviousParents }) => {
        // Get current parents
        const file = await driveRequest<any>(`/files/${fileId}?fields=parents`);

        const params = new URLSearchParams({
          addParents: newParentFolderId
        });

        if (removeFromPreviousParents && file.parents) {
          params.append('removeParents', file.parents.join(','));
        }

        const result = await driveRequest<any>(`/files/${fileId}?${params}`, {
          method: 'PATCH',
          body: JSON.stringify({})
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
     * Tool: copy_file
     * Copy a file
     */
    server.registerTool(
      'copy_file',
      {
        title: 'Copy File',
        description: 'Create a copy of a file',
        inputSchema: {
          fileId: z.string().describe('ID of the file to copy'),
          name: z
            .string()
            .optional()
            .describe('Name for the copied file. If omitted, uses "Copy of [original name]"'),
          parentFolderId: z
            .string()
            .optional()
            .describe('Destination folder ID. Omit to copy to same location.')
        }
      },
      async ({ fileId, name, parentFolderId }) => {
        const metadata: any = {};

        if (name) {
          metadata.name = name;
        }

        if (parentFolderId) {
          metadata.parents = [parentFolderId];
        }

        const result = await driveRequest<any>(`/files/${fileId}/copy`, {
          method: 'POST',
          body: JSON.stringify(metadata)
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
     * Tool: update_file_metadata
     * Update file or folder metadata
     */
    server.registerTool(
      'update_file_metadata',
      {
        title: 'Update File Metadata',
        description: 'Update metadata for a file or folder (name, description, etc.)',
        inputSchema: {
          fileId: z.string().describe('ID of the file to update'),
          name: z.string().optional().describe('New name for the file'),
          description: z.string().optional().describe('New description for the file')
        }
      },
      async ({ fileId, name, description }) => {
        const metadata: any = {};

        if (name) {
          metadata.name = name;
        }

        if (description !== undefined) {
          metadata.description = description;
        }

        const result = await driveRequest<any>(`/files/${fileId}`, {
          method: 'PATCH',
          body: JSON.stringify(metadata)
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
     * Tool: share_file
     * Share a file or folder
     */
    server.registerTool(
      'share_file',
      {
        title: 'Share File',
        description: 'Share a file or folder with users or create a shareable link',
        inputSchema: {
          fileId: z.string().describe('ID of the file to share'),
          role: z.enum(['reader', 'writer', 'commenter']).describe('Permission role'),
          type: z.enum(['user', 'anyone', 'domain', 'group']).describe('Type of permission'),
          emailAddress: z
            .string()
            .optional()
            .describe('Email address (required for user/group type)')
        }
      },
      async ({ fileId, role, type, emailAddress }) => {
        const permission: any = {
          role,
          type
        };

        if (emailAddress && (type === 'user' || type === 'group')) {
          permission.emailAddress = emailAddress;
        }

        const result = await driveRequest<any>(`/files/${fileId}/permissions`, {
          method: 'POST',
          body: JSON.stringify(permission)
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
     * Tool: list_permissions
     * List permissions for a file or folder
     */
    server.registerTool(
      'list_permissions',
      {
        title: 'List Permissions',
        description: 'List all permissions for a file or folder',
        inputSchema: {
          fileId: z.string().describe('ID of the file')
        }
      },
      async ({ fileId }) => {
        const result = await driveRequest<any>(
          `/files/${fileId}/permissions?fields=permissions(id,type,role,emailAddress,displayName)`
        );

        return {
          content: [
            {
              type: 'text' as const,
              text: JSON.stringify(result.permissions, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Resource: File Metadata
     * Access detailed metadata for a specific file
     */
    server.registerResource(
      'file-metadata',
      new ResourceTemplate('gdrive://file/{fileId}', { list: undefined }),
      {
        title: 'File Metadata',
        description: 'Access detailed metadata for a specific file or folder'
      },
      async (uri, { fileId }) => {
        const file = await driveRequest<any>(
          `/files/${fileId}?fields=id,name,mimeType,description,size,createdTime,modifiedTime,parents,owners,lastModifyingUser,webViewLink,webContentLink,iconLink,thumbnailLink,shared,sharingUser`
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(file, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: File Content
     * Access the actual content of a file
     */
    server.registerResource(
      'file-content',
      new ResourceTemplate('gdrive://file/{fileId}/content', { list: undefined }),
      {
        title: 'File Content',
        description:
          'Access the actual content of a file (text files, exported Google Docs, etc.)'
      },
      async (uri, { fileId }) => {
        // First get file metadata to check MIME type
        const file = await driveRequest<any>(`/files/${fileId}?fields=mimeType,name`);

        let content: string;
        let mimeType = 'text/plain';

        // Check if it's a Google Workspace file that needs export
        if (file.mimeType.startsWith('application/vnd.google-apps.')) {
          content = await exportFile(fileId as string, file.mimeType);
          mimeType = 'text/plain';
        } else {
          // Regular file download
          content = await downloadFile(fileId as string);
          mimeType = file.mimeType;
        }

        return {
          contents: [
            {
              uri: uri.href,
              mimeType,
              text: content
            }
          ]
        };
      }
    );

    /**
     * Resource: Folder Metadata
     * Access metadata for a specific folder
     */
    server.registerResource(
      'folder-metadata',
      new ResourceTemplate('gdrive://folder/{folderId}', { list: undefined }),
      {
        title: 'Folder Metadata',
        description: 'Access metadata for a specific folder'
      },
      async (uri, { folderId }) => {
        const folder = await driveRequest<any>(
          `/files/${folderId}?fields=id,name,mimeType,description,createdTime,modifiedTime,parents,owners,webViewLink,shared`
        );

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(folder, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Folder Children
     * List all files and folders within a specific folder
     */
    server.registerResource(
      'folder-children',
      new ResourceTemplate('gdrive://folder/{folderId}/children', { list: undefined }),
      {
        title: 'Folder Children',
        description: 'List all files and folders within a specific folder'
      },
      async (uri, { folderId }) => {
        const params = new URLSearchParams({
          q: `'${folderId}' in parents and trashed=false`,
          fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)'
        });

        const result = await driveRequest<any>(`/files?${params}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(result.files, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Root Folder
     * Access root folder information
     */
    server.registerResource(
      'root',
      new ResourceTemplate('gdrive://root', { list: undefined }),
      {
        title: 'Root Folder',
        description: 'Access information about the root folder and list root-level files'
      },
      async uri => {
        const params = new URLSearchParams({
          q: "'root' in parents and trashed=false",
          fields: 'files(id,name,mimeType,size,createdTime,modifiedTime,webViewLink)'
        });

        const result = await driveRequest<any>(`/files?${params}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(
                {
                  location: 'root',
                  files: result.files
                },
                null,
                2
              )
            }
          ]
        };
      }
    );
  }
);
