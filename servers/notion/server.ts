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
    fields: []
  }),
  getAuthorizationUrl: async input => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: input.clientId,
      response_type: 'code',
      owner: 'user',
      redirect_uri: input.redirectUri,
      state: input.state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256'
    });

    return {
      authorizationUrl: `https://api.notion.com/v1/oauth/authorize?${params.toString()}`,
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

      const authString = btoa(`${input.clientId}:${input.clientSecret}`);

      const tokenParams = new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: input.redirectUri,
        code_verifier: input.codeVerifier!
      });

      const tokenResponse = await fetch('https://api.notion.com/v1/oauth/token', {
        method: 'POST',
        headers: {
          Authorization: `Basic ${authString}`,
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
        bot_id: tokenData.bot_id,
        workspace_name: tokenData.workspace_name,
        workspace_icon: tokenData.workspace_icon,
        workspace_id: tokenData.workspace_id,
        owner: tokenData.owner
      };
    } catch (err) {
      console.log(err);
      throw err;
    }
  }
});

metorial.createServer<{
  token: string;
}>(
  {
    name: 'notion-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make Notion API calls
    async function makeNotionRequest(endpoint: string, method: string = 'GET', body?: any) {
      const url = `https://api.notion.com/v1${endpoint}`;

      const options: any = {
        method,
        headers: {
          Authorization: `Bearer ${config.token}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28'
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Notion API error: ${response.status} - ${errorText}`);
      }

      return await response.json();
    }

    // ==================== SEARCH TOOLS ====================

    server.registerTool(
      'search',
      {
        title: 'Search',
        description: 'Search across all pages and databases',
        inputSchema: {
          query: z
            .string()
            .optional()
            .describe('Search query (omit to return all accessible pages)'),
          sort: z.enum(['ascending', 'descending']).describe('Sort order'),
          pageSize: z.number().optional().describe('Number of results (max 100)')
        }
      },
      async ({ query, sort, pageSize = 100 }) => {
        const body: any = {
          page_size: pageSize
        };
        if (sort) body.sort = { direction: sort, timestamp: 'last_edited_time' };

        const result = await makeNotionRequest('/search', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_pages',
      {
        title: 'List Pages',
        description: 'List all pages in the workspace (limited to 100)',
        inputSchema: {
          pageSize: z.number().optional().describe('Number of results (max 100)')
        }
      },
      async ({ pageSize = 100 }) => {
        const result = await makeNotionRequest('/search', 'POST', {
          page_size: pageSize,
          filter: { property: 'object', value: 'page' }
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== PAGE TOOLS ====================

    server.registerTool(
      'get_page',
      {
        title: 'Get Page',
        description: 'Retrieve a page by ID',
        inputSchema: {
          pageId: z.string().describe('Page ID')
        }
      },
      async ({ pageId }) => {
        const result = await makeNotionRequest(`/pages/${pageId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_page',
      {
        title: 'Create Page',
        description: 'Create a new page',
        inputSchema: {
          parentId: z.string().describe('Parent page or database ID'),
          parentType: z.enum(['page_id', 'database_id']).describe('Parent type'),
          title: z.string().optional().describe('Page title'),
          icon: z
            .object({
              type: z.enum(['emoji', 'external']),
              emoji: z.string().optional(),
              external: z.object({ url: z.string() }).optional()
            })
            .optional()
            .describe('Page icon'),
          cover: z
            .object({
              type: z.enum(['external']),
              external: z.object({ url: z.string() })
            })
            .optional()
            .describe('Cover image'),
          properties: z.record(z.any()).optional().describe('Properties for database pages'),
          children: z.array(z.any()).optional().describe('Page content blocks')
        }
      },
      async input => {
        const page: any = {
          parent: {
            [input.parentType]: input.parentId
          }
        };

        if (input.parentType === 'page_id' && input.title) {
          page.properties = {
            title: {
              title: [{ text: { content: input.title } }]
            }
          };
        } else if (input.properties) {
          page.properties = input.properties;
        }

        if (input.icon) page.icon = input.icon;
        if (input.cover) page.cover = input.cover;
        if (input.children) page.children = input.children;

        const result = await makeNotionRequest('/pages', 'POST', page);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_page',
      {
        title: 'Update Page',
        description: 'Update page properties',
        inputSchema: {
          pageId: z.string().describe('Page ID'),
          properties: z.record(z.any()).optional().describe('Properties to update'),
          icon: z
            .object({
              type: z.enum(['emoji', 'external']),
              emoji: z.string().optional(),
              external: z.object({ url: z.string() }).optional()
            })
            .optional()
            .describe('Page icon'),
          cover: z
            .object({
              type: z.enum(['external']),
              external: z.object({ url: z.string() })
            })
            .optional()
            .describe('Cover image'),
          archived: z.boolean().optional().describe('Archive/unarchive the page')
        }
      },
      async ({ pageId, properties, icon, cover, archived }) => {
        const updates: any = {};

        if (properties) updates.properties = properties;
        if (icon) updates.icon = icon;
        if (cover) updates.cover = cover;
        if (archived !== undefined) updates.archived = archived;

        const result = await makeNotionRequest(`/pages/${pageId}`, 'PATCH', updates);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'archive_page',
      {
        title: 'Archive Page',
        description: 'Archive a page (soft delete)',
        inputSchema: {
          pageId: z.string().describe('Page ID to archive')
        }
      },
      async ({ pageId }) => {
        const result = await makeNotionRequest(`/pages/${pageId}`, 'PATCH', {
          archived: true
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== BLOCK TOOLS ====================

    server.registerTool(
      'get_block',
      {
        title: 'Get Block',
        description: 'Retrieve a block by ID',
        inputSchema: {
          blockId: z.string().describe('Block ID')
        }
      },
      async ({ blockId }) => {
        const result = await makeNotionRequest(`/blocks/${blockId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_block_children',
      {
        title: 'Get Block Children',
        description: 'Retrieve children blocks of a page or block',
        inputSchema: {
          blockId: z.string().describe('Block or page ID'),
          pageSize: z.number().optional().describe('Number of results (max 100)')
        }
      },
      async ({ blockId, pageSize = 100 }) => {
        const result = await makeNotionRequest(
          `/blocks/${blockId}/children?page_size=${pageSize}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'append_block_children',
      {
        title: 'Append Block Children',
        description: 'Append blocks to a page or block',
        inputSchema: {
          blockId: z.string().describe('Parent block or page ID'),
          children: z.array(z.any()).describe('Array of block objects to append')
        }
      },
      async ({ blockId, children }) => {
        const result = await makeNotionRequest(`/blocks/${blockId}/children`, 'PATCH', {
          children
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_block',
      {
        title: 'Update Block',
        description: 'Update a block',
        inputSchema: {
          blockId: z.string().describe('Block ID'),
          blockData: z.any().describe('Block data to update'),
          archived: z.boolean().optional().describe('Archive the block')
        }
      },
      async ({ blockId, blockData, archived }) => {
        const updates: any = blockData;
        if (archived !== undefined) updates.archived = archived;

        const result = await makeNotionRequest(`/blocks/${blockId}`, 'PATCH', updates);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'delete_block',
      {
        title: 'Delete Block',
        description: 'Delete a block',
        inputSchema: {
          blockId: z.string().describe('Block ID to delete')
        }
      },
      async ({ blockId }) => {
        const result = await makeNotionRequest(`/blocks/${blockId}`, 'DELETE');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== BLOCK CREATION HELPERS ====================

    server.registerTool(
      'add_paragraph',
      {
        title: 'Add Paragraph',
        description: 'Add a paragraph block to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID'),
          text: z.string().describe('Paragraph text'),
          color: z.string().optional().describe('Text color (e.g., "blue", "red")')
        }
      },
      async ({ pageId, text, color }) => {
        const block: any = {
          object: 'block',
          type: 'paragraph',
          paragraph: {
            rich_text: [{ type: 'text', text: { content: text } }]
          }
        };

        if (color) block.paragraph.color = color;

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: [block]
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_heading',
      {
        title: 'Add Heading',
        description: 'Add a heading block to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID'),
          text: z.string().describe('Heading text'),
          level: z.enum(['1', '2', '3']).describe('Heading level (1, 2, or 3)'),
          color: z.string().optional().describe('Text color')
        }
      },
      async ({ pageId, text, level, color }) => {
        const headingType = `heading_${level}`;
        const block: any = {
          object: 'block',
          type: headingType,
          [headingType]: {
            rich_text: [{ type: 'text', text: { content: text } }]
          }
        };

        if (color) block[headingType].color = color;

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: [block]
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_bulleted_list',
      {
        title: 'Add Bulleted List',
        description: 'Add bulleted list items to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID'),
          items: z.array(z.string()).describe('List items')
        }
      },
      async ({ pageId, items }) => {
        const blocks = items.map(item => ({
          object: 'block',
          type: 'bulleted_list_item',
          bulleted_list_item: {
            rich_text: [{ type: 'text', text: { content: item } }]
          }
        }));

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: blocks
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_numbered_list',
      {
        title: 'Add Numbered List',
        description: 'Add numbered list items to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID'),
          items: z.array(z.string()).describe('List items')
        }
      },
      async ({ pageId, items }) => {
        const blocks = items.map(item => ({
          object: 'block',
          type: 'numbered_list_item',
          numbered_list_item: {
            rich_text: [{ type: 'text', text: { content: item } }]
          }
        }));

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: blocks
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_todo',
      {
        title: 'Add To-Do',
        description: 'Add a to-do/checkbox item to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID'),
          text: z.string().describe('To-do text'),
          checked: z
            .boolean()
            .optional()
            .describe('Whether the to-do is checked (default: false)')
        }
      },
      async ({ pageId, text, checked = false }) => {
        const block = {
          object: 'block',
          type: 'to_do',
          to_do: {
            rich_text: [{ type: 'text', text: { content: text } }],
            checked
          }
        };

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: [block]
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_code_block',
      {
        title: 'Add Code Block',
        description: 'Add a code block to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID'),
          code: z.string().describe('Code content'),
          language: z
            .string()
            .optional()
            .describe('Programming language (e.g., "javascript", "python")')
        }
      },
      async ({ pageId, code, language = 'plain text' }) => {
        const block = {
          object: 'block',
          type: 'code',
          code: {
            rich_text: [{ type: 'text', text: { content: code } }],
            language
          }
        };

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: [block]
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_quote',
      {
        title: 'Add Quote',
        description: 'Add a quote block to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID'),
          text: z.string().describe('Quote text')
        }
      },
      async ({ pageId, text }) => {
        const block = {
          object: 'block',
          type: 'quote',
          quote: {
            rich_text: [{ type: 'text', text: { content: text } }]
          }
        };

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: [block]
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_callout',
      {
        title: 'Add Callout',
        description: 'Add a callout block to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID'),
          text: z.string().describe('Callout text'),
          icon: z.string().optional().describe('Emoji icon'),
          color: z.string().optional().describe('Background color')
        }
      },
      async ({ pageId, text, icon = '💡', color }) => {
        const block: any = {
          object: 'block',
          type: 'callout',
          callout: {
            rich_text: [{ type: 'text', text: { content: text } }],
            icon: { type: 'emoji', emoji: icon }
          }
        };

        if (color) block.callout.color = color;

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: [block]
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_divider',
      {
        title: 'Add Divider',
        description: 'Add a divider/horizontal rule to a page',
        inputSchema: {
          pageId: z.string().describe('Page or block ID')
        }
      },
      async ({ pageId }) => {
        const block = {
          object: 'block',
          type: 'divider',
          divider: {}
        };

        const result = await makeNotionRequest(`/blocks/${pageId}/children`, 'PATCH', {
          children: [block]
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== DATABASE TOOLS ====================

    server.registerTool(
      'get_database',
      {
        title: 'Get Database',
        description: 'Retrieve a database by ID',
        inputSchema: {
          databaseId: z.string().describe('Database ID')
        }
      },
      async ({ databaseId }) => {
        const result = await makeNotionRequest(`/databases/${databaseId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'query_database',
      {
        title: 'Query Database',
        description: 'Query a database with filters and sorts',
        inputSchema: {
          databaseId: z.string().describe('Database ID'),
          filter: z.any().optional().describe('Filter object'),
          sorts: z
            .array(
              z.object({
                property: z.string().optional(),
                timestamp: z.enum(['created_time', 'last_edited_time']).optional(),
                direction: z.enum(['ascending', 'descending'])
              })
            )
            .optional()
            .describe('Sort criteria'),
          pageSize: z.number().optional().describe('Number of results (max 100)')
        }
      },
      async ({ databaseId, filter, sorts, pageSize = 100 }) => {
        const body: any = {
          page_size: pageSize
        };

        if (filter) body.filter = filter;
        if (sorts) body.sorts = sorts;

        const result = await makeNotionRequest(`/databases/${databaseId}/query`, 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_database',
      {
        title: 'Create Database',
        description: 'Create a new database',
        inputSchema: {
          parentId: z.string().describe('Parent page ID'),
          title: z.string().describe('Database title'),
          properties: z.record(z.any()).describe('Database properties schema'),
          icon: z
            .object({
              type: z.enum(['emoji', 'external']),
              emoji: z.string().optional(),
              external: z.object({ url: z.string() }).optional()
            })
            .optional()
            .describe('Database icon'),
          cover: z
            .object({
              type: z.enum(['external']),
              external: z.object({ url: z.string() })
            })
            .optional()
            .describe('Cover image')
        }
      },
      async input => {
        const database: any = {
          parent: { page_id: input.parentId },
          title: [{ type: 'text', text: { content: input.title } }],
          properties: input.properties
        };

        if (input.icon) database.icon = input.icon;
        if (input.cover) database.cover = input.cover;

        const result = await makeNotionRequest('/databases', 'POST', database);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_database',
      {
        title: 'Update Database',
        description: 'Update database properties',
        inputSchema: {
          databaseId: z.string().describe('Database ID'),
          title: z.array(z.any()).optional().describe('Database title'),
          properties: z.record(z.any()).optional().describe('Properties to update'),
          icon: z
            .object({
              type: z.enum(['emoji', 'external']),
              emoji: z.string().optional(),
              external: z.object({ url: z.string() }).optional()
            })
            .optional()
            .describe('Database icon'),
          cover: z
            .object({
              type: z.enum(['external']),
              external: z.object({ url: z.string() })
            })
            .optional()
            .describe('Cover image')
        }
      },
      async ({ databaseId, title, properties, icon, cover }) => {
        const updates: any = {};

        if (title) updates.title = title;
        if (properties) updates.properties = properties;
        if (icon) updates.icon = icon;
        if (cover) updates.cover = cover;

        const result = await makeNotionRequest(`/databases/${databaseId}`, 'PATCH', updates);
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
        description: 'Retrieve a user by ID',
        inputSchema: {
          userId: z.string().describe('User ID')
        }
      },
      async ({ userId }) => {
        const result = await makeNotionRequest(`/users/${userId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'list_users',
      {
        title: 'List Users',
        description: 'List all users in the workspace',
        inputSchema: {
          pageSize: z.number().optional().describe('Number of results (max 100)')
        }
      },
      async ({ pageSize = 100 }) => {
        const result = await makeNotionRequest(`/users?page_size=${pageSize}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_current_user',
      {
        title: 'Get Current User',
        description: 'Get the bot user information',
        inputSchema: {}
      },
      async () => {
        const result = await makeNotionRequest('/users/me');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== COMMENT TOOLS ====================

    server.registerTool(
      'get_comments',
      {
        title: 'Get Comments',
        description: 'Retrieve comments from a page or block',
        inputSchema: {
          blockId: z.string().describe('Block or page ID'),
          pageSize: z.number().optional().describe('Number of results (max 100)')
        }
      },
      async ({ blockId, pageSize = 100 }) => {
        const result = await makeNotionRequest(
          `/comments?block_id=${blockId}&page_size=${pageSize}`
        );
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_comment',
      {
        title: 'Create Comment',
        description: 'Add a comment to a page or discussion',
        inputSchema: {
          pageId: z.string().optional().describe('Page ID (for new discussion)'),
          discussionId: z.string().optional().describe('Discussion ID (for reply)'),
          text: z.string().describe('Comment text')
        }
      },
      async ({ pageId, discussionId, text }) => {
        const body: any = {
          rich_text: [{ type: 'text', text: { content: text } }]
        };

        if (discussionId) {
          body.discussion_id = discussionId;
        } else if (pageId) {
          body.parent = { page_id: pageId };
        } else {
          throw new Error('Either pageId or discussionId must be provided');
        }

        const result = await makeNotionRequest('/comments', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== HELPER TOOLS ====================

    server.registerTool(
      'create_simple_page',
      {
        title: 'Create Simple Page',
        description: 'Create a page with title and basic content blocks',
        inputSchema: {
          parentId: z.string().describe('Parent page ID'),
          title: z.string().describe('Page title'),
          content: z
            .array(
              z.object({
                type: z.enum(['paragraph', 'heading', 'bullet', 'todo']),
                text: z.string(),
                level: z.enum(['1', '2', '3']).optional(),
                checked: z.boolean().optional()
              })
            )
            .optional()
            .describe('Content blocks')
        }
      },
      async ({ parentId, title, content }) => {
        const page: any = {
          parent: { page_id: parentId },
          properties: {
            title: {
              title: [{ text: { content: title } }]
            }
          }
        };

        if (content && content.length > 0) {
          page.children = content.map(item => {
            switch (item.type) {
              case 'paragraph':
                return {
                  object: 'block',
                  type: 'paragraph',
                  paragraph: {
                    rich_text: [{ type: 'text', text: { content: item.text } }]
                  }
                };
              case 'heading':
                const headingType = `heading_${item.level || '2'}`;
                return {
                  object: 'block',
                  type: headingType,
                  [headingType]: {
                    rich_text: [{ type: 'text', text: { content: item.text } }]
                  }
                };
              case 'bullet':
                return {
                  object: 'block',
                  type: 'bulleted_list_item',
                  bulleted_list_item: {
                    rich_text: [{ type: 'text', text: { content: item.text } }]
                  }
                };
              case 'todo':
                return {
                  object: 'block',
                  type: 'to_do',
                  to_do: {
                    rich_text: [{ type: 'text', text: { content: item.text } }],
                    checked: item.checked || false
                  }
                };
            }
          });
        }

        const result = await makeNotionRequest('/pages', 'POST', page);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_page_content',
      {
        title: 'Get Page Content',
        description: 'Get a page and all its content blocks in one call',
        inputSchema: {
          pageId: z.string().describe('Page ID')
        }
      },
      async ({ pageId }) => {
        const page = await makeNotionRequest(`/pages/${pageId}`);
        const blocks = await makeNotionRequest(`/blocks/${pageId}/children?page_size=100`);

        return {
          content: [{ type: 'text', text: JSON.stringify({ page, blocks }, null, 2) }]
        };
      }
    );

    server.registerTool(
      'duplicate_page',
      {
        title: 'Duplicate Page',
        description: 'Duplicate a page with all its content',
        inputSchema: {
          pageId: z.string().describe('Page ID to duplicate'),
          newTitle: z
            .string()
            .optional()
            .describe('Title for the new page (default: copy of original)')
        }
      },
      async ({ pageId, newTitle }) => {
        // Get the original page
        const originalPage: any = await makeNotionRequest(`/pages/${pageId}`);
        const blocks: any = await makeNotionRequest(
          `/blocks/${pageId}/children?page_size=100`
        );

        // Create new page with same properties
        const newPage: any = {
          parent: originalPage.parent,
          properties: originalPage.properties
        };

        // Update title if provided
        if (newTitle && newPage.properties.title) {
          newPage.properties.title = {
            title: [{ text: { content: newTitle } }]
          };
        }

        // Copy icon and cover
        if (originalPage.icon) newPage.icon = originalPage.icon;
        if (originalPage.cover) newPage.cover = originalPage.cover;

        // Copy blocks
        if (blocks.results && blocks.results.length > 0) {
          newPage.children = blocks.results.map((block: any) => {
            const {
              id,
              created_time,
              created_by,
              last_edited_time,
              last_edited_by,
              has_children,
              archived,
              ...blockData
            } = block;
            return blockData;
          });
        }

        const result = await makeNotionRequest('/pages', 'POST', newPage);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );
  }
);
