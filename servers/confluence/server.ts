import { metorial, z } from '@metorial/mcp-server-sdk';

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
    fields: [
      {
        type: 'text',
        label: 'Confluence Cloud Site',
        key: 'cloudId',
        isRequired: true,
        placeholder: 'your-domain (from your-domain.atlassian.net)',
        description: 'Your Confluence cloud domain name without .atlassian.net'
      }
    ]
  }),
  getAuthorizationUrl: async input => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: input.clientId,
      scope:
        'read:confluence-content.all write:confluence-content read:confluence-space.summary write:confluence-space read:confluence-props write:confluence-props read:confluence-user offline_access',
      redirect_uri: input.redirectUri,
      state: input.state,
      response_type: 'code',
      prompt: 'consent',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      authorizationUrl: `https://auth.atlassian.com/authorize?${params.toString()}`,
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
        grant_type: 'authorization_code',
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: code,
        redirect_uri: input.redirectUri,
        code_verifier: input.codeVerifier!
      });

      const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
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

      // Get accessible resources (cloud IDs)
      const resourcesResponse = await fetch(
        'https://api.atlassian.com/oauth/token/accessible-resources',
        {
          headers: {
            Authorization: `Bearer ${tokenData.access_token}`,
            Accept: 'application/json'
          }
        }
      );

      if (!resourcesResponse.ok) {
        throw new Error('Failed to get accessible resources');
      }

      const resources: any = await resourcesResponse.json();

      // Find the matching cloud ID or use the first one
      let selectedResource = resources[0];
      if (input.fields.cloudId) {
        const matching = resources.find(
          (r: any) => r.url.includes(input.fields.cloudId) || r.id === input.fields.cloudId
        );
        if (matching) selectedResource = matching;
      }

      return {
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
        expires_in: tokenData.expires_in,
        token_type: tokenData.token_type,
        scope: tokenData.scope,
        cloud_id: selectedResource.id,
        site_url: selectedResource.url,
        site_name: selectedResource.name
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
        client_id: input.clientId,
        client_secret: input.clientSecret,
        refresh_token: input.refreshToken
      });

      const tokenResponse = await fetch('https://auth.atlassian.com/oauth/token', {
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

metorial.createServer<{
  token: string;
  cloud_id: string;
}>(
  {
    name: 'confluence-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make Confluence API calls
    async function makeConfluenceRequest(
      endpoint: string,
      method: string = 'GET',
      body?: any
    ) {
      const url = `https://api.atlassian.com/ex/confluence/${config.cloud_id}${endpoint}`;

      const options: any = {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Confluence API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    }

    // ==================== SPACE TOOLS ====================

    server.registerTool(
      'list_spaces',
      {
        title: 'List Spaces',
        description: 'List all Confluence spaces',
        inputSchema: {
          type: z.enum(['global', 'personal']).optional().describe('Space type filter'),
          status: z.enum(['current', 'archived']).optional().describe('Space status'),
          limit: z.number().optional().describe('Number of results (default: 25, max: 250)')
        }
      },
      async ({ type, status, limit = 25 }) => {
        let endpoint = `/wiki/rest/api/space?limit=${limit}`;
        if (type) endpoint += `&type=${type}`;
        if (status) endpoint += `&status=${status}`;

        const result = await makeConfluenceRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_space',
      {
        title: 'Get Space',
        description: 'Get details of a specific space',
        inputSchema: {
          spaceKey: z.string().describe('Space key'),
          expand: z
            .string()
            .optional()
            .describe('Additional data to expand (e.g., "description,homepage")')
        }
      },
      async ({ spaceKey, expand }) => {
        let endpoint = `/wiki/rest/api/space/${spaceKey}`;
        if (expand) endpoint += `?expand=${expand}`;

        const result = await makeConfluenceRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_space',
      {
        title: 'Create Space',
        description: 'Create a new Confluence space',
        inputSchema: {
          key: z.string().describe('Space key (unique identifier)'),
          name: z.string().describe('Space name'),
          description: z.string().optional().describe('Space description'),
          type: z
            .enum(['global', 'personal'])
            .optional()
            .describe('Space type (default: global)')
        }
      },
      async input => {
        const space: any = {
          key: input.key,
          name: input.name,
          type: input.type || 'global'
        };

        if (input.description) {
          space.description = {
            plain: {
              value: input.description,
              representation: 'plain'
            }
          };
        }

        const result = await makeConfluenceRequest('/wiki/rest/api/space', 'POST', space);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_space',
      {
        title: 'Update Space',
        description: 'Update space details',
        inputSchema: {
          spaceKey: z.string().describe('Space key'),
          name: z.string().optional().describe('New space name'),
          description: z.string().optional().describe('New space description')
        }
      },
      async ({ spaceKey, name, description }) => {
        const updates: any = {};

        if (name) updates.name = name;
        if (description) {
          updates.description = {
            plain: {
              value: description,
              representation: 'plain'
            }
          };
        }

        const result = await makeConfluenceRequest(
          `/wiki/rest/api/space/${spaceKey}`,
          'PUT',
          updates
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_space',
      {
        title: 'Delete Space',
        description: 'Delete a Confluence space',
        inputSchema: {
          spaceKey: z.string().describe('Space key to delete')
        }
      },
      async ({ spaceKey }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/space/${spaceKey}`,
          'DELETE'
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: spaceKey }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== PAGE/CONTENT TOOLS ====================

    server.registerTool(
      'get_page',
      {
        title: 'Get Page',
        description: 'Get a specific page by ID',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          expand: z
            .string()
            .optional()
            .describe('Fields to expand (e.g., "body.storage,version,space")')
        }
      },
      async ({ pageId, expand = 'body.storage,version,space' }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}?expand=${expand}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_pages',
      {
        title: 'Get Pages',
        description: 'Get pages from a space',
        inputSchema: {
          spaceKey: z.string().describe('Space key'),
          title: z.string().optional().describe('Filter by page title'),
          limit: z.number().optional().describe('Number of results (default: 25, max: 100)'),
          expand: z.string().optional().describe('Fields to expand')
        }
      },
      async ({ spaceKey, title, limit = 25, expand }) => {
        let endpoint = `/wiki/rest/api/content?spaceKey=${spaceKey}&type=page&limit=${limit}`;
        if (title) endpoint += `&title=${encodeURIComponent(title)}`;
        if (expand) endpoint += `&expand=${expand}`;

        const result = await makeConfluenceRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_page',
      {
        title: 'Create Page',
        description: 'Create a new page in Confluence',
        inputSchema: {
          spaceKey: z.string().describe('Space key'),
          title: z.string().describe('Page title'),
          body: z.string().describe('Page content (HTML or storage format)'),
          parentId: z.string().optional().describe('Parent page ID'),
          representation: z
            .enum(['storage', 'view'])
            .optional()
            .describe('Body format (default: storage)')
        }
      },
      async input => {
        const page: any = {
          type: 'page',
          title: input.title,
          space: { key: input.spaceKey },
          body: {
            storage: {
              value: input.body,
              representation: input.representation || 'storage'
            }
          }
        };

        if (input.parentId) {
          page.ancestors = [{ id: input.parentId }];
        }

        const result = await makeConfluenceRequest('/wiki/rest/api/content', 'POST', page);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_page',
      {
        title: 'Update Page',
        description: 'Update an existing page',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          title: z.string().optional().describe('New page title'),
          body: z.string().optional().describe('New page content'),
          version: z.number().describe('Current version number (required for updates)'),
          representation: z
            .enum(['storage', 'view'])
            .optional()
            .describe('Body format (default: storage)')
        }
      },
      async input => {
        const update: any = {
          version: { number: input.version + 1 },
          type: 'page'
        };

        if (input.title) update.title = input.title;
        if (input.body) {
          update.body = {
            storage: {
              value: input.body,
              representation: input.representation || 'storage'
            }
          };
        }

        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${input.pageId}`,
          'PUT',
          update
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_page',
      {
        title: 'Delete Page',
        description: 'Delete a page (move to trash)',
        inputSchema: {
          pageId: z.string().describe('Page ID to delete')
        }
      },
      async ({ pageId }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}`,
          'DELETE'
        );
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, deleted: pageId }, null, 2) }
          ]
        };
      }
    );

    server.registerTool(
      'get_page_children',
      {
        title: 'Get Page Children',
        description: 'Get child pages of a page',
        inputSchema: {
          pageId: z.string().describe('Parent page ID'),
          limit: z.number().optional().describe('Number of results (default: 25)')
        }
      },
      async ({ pageId, limit = 25 }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}/child/page?limit=${limit}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'move_page',
      {
        title: 'Move Page',
        description: 'Move a page to a different location',
        inputSchema: {
          pageId: z.string().describe('Page ID to move'),
          targetSpaceKey: z.string().optional().describe('Target space key'),
          targetParentId: z.string().optional().describe('Target parent page ID'),
          position: z
            .enum(['before', 'after', 'append'])
            .optional()
            .describe('Position relative to target')
        }
      },
      async ({ pageId, targetSpaceKey, targetParentId, position = 'append' }) => {
        const moveRequest: any = {
          position
        };

        if (targetSpaceKey) {
          moveRequest.targetType = 'space';
          moveRequest.targetKey = targetSpaceKey;
        } else if (targetParentId) {
          moveRequest.targetType = 'page';
          moveRequest.targetId = targetParentId;
        }

        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}/move/${position}`,
          'PUT',
          moveRequest
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== BLOG POST TOOLS ====================

    server.registerTool(
      'get_blog_posts',
      {
        title: 'Get Blog Posts',
        description: 'Get blog posts from a space',
        inputSchema: {
          spaceKey: z.string().describe('Space key'),
          limit: z.number().optional().describe('Number of results (default: 25)')
        }
      },
      async ({ spaceKey, limit = 25 }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content?spaceKey=${spaceKey}&type=blogpost&limit=${limit}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_blog_post',
      {
        title: 'Create Blog Post',
        description: 'Create a new blog post',
        inputSchema: {
          spaceKey: z.string().describe('Space key'),
          title: z.string().describe('Blog post title'),
          body: z.string().describe('Blog post content (HTML or storage format)')
        }
      },
      async ({ spaceKey, title, body }) => {
        const blogPost = {
          type: 'blogpost',
          title,
          space: { key: spaceKey },
          body: {
            storage: {
              value: body,
              representation: 'storage'
            }
          }
        };

        const result = await makeConfluenceRequest('/wiki/rest/api/content', 'POST', blogPost);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== SEARCH TOOLS ====================

    server.registerTool(
      'search_content',
      {
        title: 'Search Content',
        description: 'Search for content using CQL (Confluence Query Language)',
        inputSchema: {
          cql: z.string().describe('CQL query (e.g., "type=page and space=DEMO")'),
          limit: z.number().optional().describe('Number of results (default: 25, max: 100)'),
          expand: z.string().optional().describe('Fields to expand')
        }
      },
      async ({ cql, limit = 25, expand }) => {
        let endpoint = `/wiki/rest/api/content/search?cql=${encodeURIComponent(
          cql
        )}&limit=${limit}`;
        if (expand) endpoint += `&expand=${expand}`;

        const result = await makeConfluenceRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'search_by_title',
      {
        title: 'Search by Title',
        description: 'Search content by title',
        inputSchema: {
          title: z.string().describe('Title to search for'),
          spaceKey: z.string().optional().describe('Limit search to specific space'),
          type: z.enum(['page', 'blogpost']).optional().describe('Content type'),
          limit: z.number().optional().describe('Number of results (default: 25)')
        }
      },
      async ({ title, spaceKey, type, limit = 25 }) => {
        let cql = `title~"${title}"`;
        if (spaceKey) cql += ` and space=${spaceKey}`;
        if (type) cql += ` and type=${type}`;

        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/search?cql=${encodeURIComponent(cql)}&limit=${limit}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ATTACHMENT TOOLS ====================

    server.registerTool(
      'get_attachments',
      {
        title: 'Get Attachments',
        description: 'Get attachments for a page',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          limit: z.number().optional().describe('Number of results (default: 25)')
        }
      },
      async ({ pageId, limit = 25 }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}/child/attachment?limit=${limit}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_attachment',
      {
        title: 'Get Attachment',
        description: 'Get details of a specific attachment',
        inputSchema: {
          attachmentId: z.string().describe('Attachment ID')
        }
      },
      async ({ attachmentId }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${attachmentId}?expand=version,container`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== LABEL TOOLS ====================

    server.registerTool(
      'get_labels',
      {
        title: 'Get Labels',
        description: 'Get labels on a page or space',
        inputSchema: {
          contentId: z.string().describe('Content ID (page, blogpost, or space)')
        }
      },
      async ({ contentId }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${contentId}/label`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_labels',
      {
        title: 'Add Labels',
        description: 'Add labels to content',
        inputSchema: {
          contentId: z.string().describe('Content ID'),
          labels: z.array(z.string()).describe('Label names to add')
        }
      },
      async ({ contentId, labels }) => {
        const labelObjects = labels.map(name => ({
          prefix: 'global',
          name
        }));

        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${contentId}/label`,
          'POST',
          labelObjects
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'remove_label',
      {
        title: 'Remove Label',
        description: 'Remove a label from content',
        inputSchema: {
          contentId: z.string().describe('Content ID'),
          labelName: z.string().describe('Label name to remove')
        }
      },
      async ({ contentId, labelName }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${contentId}/label/${labelName}`,
          'DELETE'
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, removed: labelName }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== COMMENT TOOLS ====================

    server.registerTool(
      'get_comments',
      {
        title: 'Get Comments',
        description: 'Get comments on a page',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          limit: z.number().optional().describe('Number of results (default: 25)')
        }
      },
      async ({ pageId, limit = 25 }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}/child/comment?expand=body.storage&limit=${limit}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_comment',
      {
        title: 'Add Comment',
        description: 'Add a comment to a page',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          comment: z.string().describe('Comment text (HTML or storage format)')
        }
      },
      async ({ pageId, comment }) => {
        const commentObj = {
          type: 'comment',
          container: { id: pageId, type: 'page' },
          body: {
            storage: {
              value: comment,
              representation: 'storage'
            }
          }
        };

        const result = await makeConfluenceRequest(
          '/wiki/rest/api/content',
          'POST',
          commentObj
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_comment',
      {
        title: 'Update Comment',
        description: 'Update an existing comment',
        inputSchema: {
          commentId: z.string().describe('Comment ID'),
          comment: z.string().describe('New comment text'),
          version: z.number().describe('Current version number')
        }
      },
      async ({ commentId, comment, version }) => {
        const update = {
          type: 'comment',
          version: { number: version + 1 },
          body: {
            storage: {
              value: comment,
              representation: 'storage'
            }
          }
        };

        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${commentId}`,
          'PUT',
          update
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_comment',
      {
        title: 'Delete Comment',
        description: 'Delete a comment',
        inputSchema: {
          commentId: z.string().describe('Comment ID to delete')
        }
      },
      async ({ commentId }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${commentId}`,
          'DELETE'
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: commentId }, null, 2)
            }
          ]
        };
      }
    );

    // ==================== TEMPLATE TOOLS ====================

    server.registerTool(
      'get_templates',
      {
        title: 'Get Templates',
        description: 'Get page templates from a space',
        inputSchema: {
          spaceKey: z.string().describe('Space key')
        }
      },
      async ({ spaceKey }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/template/page?spaceKey=${spaceKey}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_page_from_template',
      {
        title: 'Create Page from Template',
        description: 'Create a page using a template',
        inputSchema: {
          spaceKey: z.string().describe('Space key'),
          templateId: z.string().describe('Template ID'),
          title: z.string().describe('Page title'),
          parentId: z.string().optional().describe('Parent page ID')
        }
      },
      async ({ spaceKey, templateId, title, parentId }) => {
        const page: any = {
          type: 'page',
          title,
          space: { key: spaceKey },
          metadata: {
            properties: {
              'content-appearance-draft': {
                value: 'full-width'
              }
            }
          }
        };

        // First get the template
        const template: any = await makeConfluenceRequest(
          `/wiki/rest/api/template/${templateId}`
        );
        page.body = template.body;

        if (parentId) {
          page.ancestors = [{ id: parentId }];
        }

        const result = await makeConfluenceRequest('/wiki/rest/api/content', 'POST', page);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== VERSION/HISTORY TOOLS ====================

    server.registerTool(
      'get_page_history',
      {
        title: 'Get Page History',
        description: 'Get version history of a page',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          limit: z.number().optional().describe('Number of versions to return (default: 25)')
        }
      },
      async ({ pageId, limit = 25 }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}/history?limit=${limit}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_page_version',
      {
        title: 'Get Page Version',
        description: 'Get a specific version of a page',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          version: z.number().describe('Version number')
        }
      },
      async ({ pageId, version }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}?version=${version}&expand=body.storage`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'restore_page_version',
      {
        title: 'Restore Page Version',
        description: 'Restore a previous version of a page',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          versionNumber: z.number().describe('Version number to restore'),
          currentVersion: z.number().describe('Current version number')
        }
      },
      async ({ pageId, versionNumber, currentVersion }) => {
        // Get the old version
        const oldVersion: any = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}?version=${versionNumber}&expand=body.storage`
        );

        // Update to create a new version with old content
        const update = {
          type: 'page',
          version: { number: currentVersion + 1 },
          title: oldVersion.title,
          body: oldVersion.body
        };

        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}`,
          'PUT',
          update
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== USER TOOLS ====================

    server.registerTool(
      'get_user',
      {
        title: 'Get User',
        description: 'Get user information by account ID',
        inputSchema: {
          accountId: z.string().describe('User account ID')
        }
      },
      async ({ accountId }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/user?accountId=${accountId}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_current_user',
      {
        title: 'Get Current User',
        description: 'Get information about the current authenticated user',
        inputSchema: {}
      },
      async () => {
        const result = await makeConfluenceRequest('/wiki/rest/api/user/current');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'search_users',
      {
        title: 'Search Users',
        description: 'Search for users',
        inputSchema: {
          query: z.string().describe('Search query (username or display name)'),
          limit: z.number().optional().describe('Number of results (default: 25)')
        }
      },
      async ({ query, limit = 25 }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/user/search?cql=user.fullname~"${encodeURIComponent(
            query
          )}"&limit=${limit}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== PERMISSIONS TOOLS ====================

    server.registerTool(
      'get_space_permissions',
      {
        title: 'Get Space Permissions',
        description: 'Get permissions for a space',
        inputSchema: {
          spaceKey: z.string().describe('Space key')
        }
      },
      async ({ spaceKey }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/space/${spaceKey}/permission`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_content_restrictions',
      {
        title: 'Get Content Restrictions',
        description: 'Get restrictions (permissions) on a page',
        inputSchema: {
          contentId: z.string().describe('Content ID')
        }
      },
      async ({ contentId }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${contentId}/restriction?expand=restrictions.user,restrictions.group`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== MACRO TOOLS ====================

    server.registerTool(
      'insert_macro',
      {
        title: 'Insert Macro',
        description: 'Create page content with a macro',
        inputSchema: {
          macroName: z
            .string()
            .describe('Macro name (e.g., "info", "note", "warning", "code")'),
          body: z.string().optional().describe('Macro body content'),
          parameters: z.record(z.string()).optional().describe('Macro parameters')
        }
      },
      async ({ macroName, body, parameters }) => {
        let macroHtml = `<ac:structured-macro ac:name="${macroName}">`;

        if (parameters) {
          for (const [key, value] of Object.entries(parameters)) {
            macroHtml += `<ac:parameter ac:name="${key}">${value}</ac:parameter>`;
          }
        }

        if (body) {
          macroHtml += `<ac:rich-text-body>${body}</ac:rich-text-body>`;
        }

        macroHtml += '</ac:structured-macro>';

        return {
          content: [{ type: 'text', text: JSON.stringify({ macroHtml }, null, 2) }]
        };
      }
    );

    // ==================== ANALYTICS TOOLS ====================

    server.registerTool(
      'get_page_views',
      {
        title: 'Get Page Views',
        description: 'Get view statistics for a page',
        inputSchema: {
          pageId: z.string().describe('Page ID')
        }
      },
      async ({ pageId }) => {
        const result = await makeConfluenceRequest(
          `/wiki/rest/api/content/${pageId}?expand=history.lastUpdated,version,metadata.likes`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== HELPER TOOLS ====================

    server.registerTool(
      'get_space_content',
      {
        title: 'Get Space Content',
        description: 'Get all pages and blog posts from a space',
        inputSchema: {
          spaceKey: z.string().describe('Space key'),
          limit: z.number().optional().describe('Results per type (default: 25)')
        }
      },
      async ({ spaceKey, limit = 25 }) => {
        const pages = await makeConfluenceRequest(
          `/wiki/rest/api/content?spaceKey=${spaceKey}&type=page&limit=${limit}`
        );
        const blogPosts = await makeConfluenceRequest(
          `/wiki/rest/api/content?spaceKey=${spaceKey}&type=blogpost&limit=${limit}`
        );

        return {
          content: [{ type: 'text', text: JSON.stringify({ pages, blogPosts }, null, 2) }]
        };
      }
    );
  }
);
