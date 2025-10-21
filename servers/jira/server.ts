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
        label: 'Jira Cloud Site',
        key: 'cloudId',
        isRequired: true,
        placeholder: 'your-domain (from your-domain.atlassian.net)',
        description: 'Your Jira cloud domain name without .atlassian.net'
      }
    ]
  }),
  getAuthorizationUrl: async input => {
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: input.clientId,
      scope: 'read:jira-work write:jira-work read:jira-user offline_access',
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

      const resources = (await resourcesResponse.json()) as any;

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
    name: 'jira-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make Jira API calls
    async function makeJiraRequest(endpoint: string, method: string = 'GET', body?: any) {
      const apiVersion = '3';
      const url = `https://api.atlassian.com/ex/jira/${config.cloud_id}/rest/api/${apiVersion}${endpoint}`;

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
        throw new Error(`Jira API error: ${response.status} - ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return { success: true };
      }

      return await response.json();
    }

    // ==================== PROJECT TOOLS ====================

    server.registerTool(
      'list_projects',
      {
        title: 'List Projects',
        description: 'Get a list of all projects',
        inputSchema: {
          expand: z
            .string()
            .optional()
            .describe('Additional data to include (e.g., "description,lead")'),
          maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
        }
      },
      async ({ expand, maxResults = 50 }) => {
        let endpoint = `/project/search?maxResults=${maxResults}`;
        if (expand) {
          endpoint += `&expand=${expand}`;
        }
        const result = await makeJiraRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_project',
      {
        title: 'Get Project',
        description: 'Get details of a specific project',
        inputSchema: {
          projectIdOrKey: z.string().describe('Project ID or project key'),
          expand: z.string().optional().describe('Additional data to include')
        }
      },
      async ({ projectIdOrKey, expand }) => {
        let endpoint = `/project/${projectIdOrKey}`;
        if (expand) {
          endpoint += `?expand=${expand}`;
        }
        const result = await makeJiraRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ISSUE TOOLS ====================

    server.registerTool(
      'search_issues',
      {
        title: 'Search Issues',
        description: 'Search for issues using JQL (Jira Query Language)',
        inputSchema: {
          jql: z
            .string()
            .describe('JQL query string (e.g., "project = PROJ AND status = Open")'),
          maxResults: z
            .number()
            .optional()
            .describe('Maximum number of results (default: 50)'),
          startAt: z
            .number()
            .optional()
            .describe('Starting index for pagination (default: 0)'),
          fields: z.array(z.string()).optional().describe('Fields to return (default: all)'),
          expand: z.string().optional().describe('Additional data to expand')
        }
      },
      async ({ jql, maxResults = 50, startAt = 0, fields, expand }) => {
        const body: any = {
          jql,
          maxResults,
          startAt
        };

        if (fields) body.fields = fields;
        if (expand) body.expand = expand;

        const result = await makeJiraRequest('/search', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_issue',
      {
        title: 'Get Issue',
        description: 'Get details of a specific issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or issue key (e.g., PROJ-123)'),
          fields: z.array(z.string()).optional().describe('Specific fields to return'),
          expand: z
            .string()
            .optional()
            .describe('Additional data to expand (e.g., "changelog,renderedFields")')
        }
      },
      async ({ issueIdOrKey, fields, expand }) => {
        let endpoint = `/issue/${issueIdOrKey}`;
        const params: string[] = [];

        if (fields) params.push(`fields=${fields.join(',')}`);
        if (expand) params.push(`expand=${expand}`);

        if (params.length > 0) {
          endpoint += `?${params.join('&')}`;
        }

        const result = await makeJiraRequest(endpoint);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_issue',
      {
        title: 'Create Issue',
        description: 'Create a new issue',
        inputSchema: {
          projectKey: z.string().describe('Project key (e.g., PROJ)'),
          summary: z.string().describe('Issue summary/title'),
          issueType: z.string().describe('Issue type (e.g., Bug, Task, Story)'),
          description: z.string().optional().describe('Issue description'),
          priority: z.string().optional().describe('Priority name (e.g., High, Medium, Low)'),
          assignee: z.string().optional().describe('Assignee account ID'),
          labels: z.array(z.string()).optional().describe('Labels to add'),
          components: z.array(z.string()).optional().describe('Component names'),
          duedate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
          parentKey: z.string().optional().describe('Parent issue key for subtasks')
        }
      },
      async input => {
        const fields: any = {
          project: { key: input.projectKey },
          summary: input.summary,
          issuetype: { name: input.issueType }
        };

        if (input.description) {
          fields.description = {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: input.description }]
              }
            ]
          };
        }

        if (input.priority) fields.priority = { name: input.priority };
        if (input.assignee) fields.assignee = { id: input.assignee };
        if (input.labels) fields.labels = input.labels;
        if (input.components) fields.components = input.components.map(name => ({ name }));
        if (input.duedate) fields.duedate = input.duedate;
        if (input.parentKey) fields.parent = { key: input.parentKey };

        const result = await makeJiraRequest('/issue', 'POST', { fields });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'update_issue',
      {
        title: 'Update Issue',
        description: 'Update an existing issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key to update'),
          summary: z.string().optional().describe('New summary'),
          description: z.string().optional().describe('New description'),
          priority: z.string().optional().describe('Priority name'),
          assignee: z.string().optional().describe('Assignee account ID'),
          labels: z.array(z.string()).optional().describe('Labels (replaces existing)'),
          duedate: z.string().optional().describe('Due date (YYYY-MM-DD)')
        }
      },
      async ({ issueIdOrKey, ...updates }) => {
        const fields: any = {};

        if (updates.summary) fields.summary = updates.summary;
        if (updates.description) {
          fields.description = {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: updates.description }]
              }
            ]
          };
        }
        if (updates.priority) fields.priority = { name: updates.priority };
        if (updates.assignee) fields.assignee = { id: updates.assignee };
        if (updates.labels) fields.labels = updates.labels;
        if (updates.duedate) fields.duedate = updates.duedate;

        const result: any = await makeJiraRequest(`/issue/${issueIdOrKey}`, 'PUT', { fields });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, key: issueIdOrKey, ...result }, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_issue',
      {
        title: 'Delete Issue',
        description: 'Delete an issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key to delete'),
          deleteSubtasks: z
            .boolean()
            .optional()
            .describe('Whether to delete subtasks (default: false)')
        }
      },
      async ({ issueIdOrKey, deleteSubtasks = false }) => {
        let endpoint = `/issue/${issueIdOrKey}`;
        if (deleteSubtasks) {
          endpoint += '?deleteSubtasks=true';
        }
        const result = await makeJiraRequest(endpoint, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ success: true, deleted: issueIdOrKey }, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'assign_issue',
      {
        title: 'Assign Issue',
        description: 'Assign an issue to a user',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key'),
          accountId: z
            .string()
            .describe(
              'Account ID of the user to assign (use "-1" for automatic, "null" for unassigned)'
            )
        }
      },
      async ({ issueIdOrKey, accountId }) => {
        const body = accountId === 'null' ? null : { accountId };
        const result: any = await makeJiraRequest(
          `/issue/${issueIdOrKey}/assignee`,
          'PUT',
          body
        );
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, ...result }, null, 2) }
          ]
        };
      }
    );

    // ==================== TRANSITION TOOLS ====================

    server.registerTool(
      'get_transitions',
      {
        title: 'Get Issue Transitions',
        description: 'Get available transitions for an issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key')
        }
      },
      async ({ issueIdOrKey }) => {
        const result = await makeJiraRequest(`/issue/${issueIdOrKey}/transitions`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'transition_issue',
      {
        title: 'Transition Issue',
        description: 'Transition an issue to a different status',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key'),
          transitionId: z.string().describe('Transition ID (get from get_transitions)'),
          comment: z.string().optional().describe('Comment to add with transition'),
          resolution: z.string().optional().describe("Resolution name (e.g., Done, Won't Do)")
        }
      },
      async ({ issueIdOrKey, transitionId, comment, resolution }) => {
        const body: any = {
          transition: { id: transitionId }
        };

        if (comment) {
          body.update = {
            comment: [
              {
                add: {
                  body: {
                    type: 'doc',
                    version: 1,
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: comment }]
                      }
                    ]
                  }
                }
              }
            ]
          };
        }

        if (resolution) {
          body.fields = { resolution: { name: resolution } };
        }

        const result: any = await makeJiraRequest(
          `/issue/${issueIdOrKey}/transitions`,
          'POST',
          body
        );
        return {
          content: [
            { type: 'text', text: JSON.stringify({ success: true, ...result }, null, 2) }
          ]
        };
      }
    );

    // ==================== COMMENT TOOLS ====================

    server.registerTool(
      'get_comments',
      {
        title: 'Get Issue Comments',
        description: 'Get all comments on an issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key'),
          maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
        }
      },
      async ({ issueIdOrKey, maxResults = 50 }) => {
        const result = await makeJiraRequest(
          `/issue/${issueIdOrKey}/comment?maxResults=${maxResults}`
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
        description: 'Add a comment to an issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key'),
          comment: z.string().describe('Comment text')
        }
      },
      async ({ issueIdOrKey, comment }) => {
        const body = {
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: comment }]
              }
            ]
          }
        };

        const result = await makeJiraRequest(`/issue/${issueIdOrKey}/comment`, 'POST', body);
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
          issueIdOrKey: z.string().describe('Issue ID or key'),
          commentId: z.string().describe('Comment ID'),
          comment: z.string().describe('New comment text')
        }
      },
      async ({ issueIdOrKey, commentId, comment }) => {
        const body = {
          body: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: comment }]
              }
            ]
          }
        };

        const result = await makeJiraRequest(
          `/issue/${issueIdOrKey}/comment/${commentId}`,
          'PUT',
          body
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
        description: 'Delete a comment from an issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key'),
          commentId: z.string().describe('Comment ID to delete')
        }
      },
      async ({ issueIdOrKey, commentId }) => {
        const result = await makeJiraRequest(
          `/issue/${issueIdOrKey}/comment/${commentId}`,
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

    // ==================== WORKLOG TOOLS ====================

    server.registerTool(
      'get_worklogs',
      {
        title: 'Get Issue Worklogs',
        description: 'Get all worklogs for an issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key')
        }
      },
      async ({ issueIdOrKey }) => {
        const result = await makeJiraRequest(`/issue/${issueIdOrKey}/worklog`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'add_worklog',
      {
        title: 'Add Worklog',
        description: 'Log work on an issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key'),
          timeSpent: z.string().describe('Time spent (e.g., "3h 30m", "1d 2h")'),
          comment: z.string().optional().describe('Work description'),
          started: z.string().optional().describe('Start date/time (ISO 8601 format)')
        }
      },
      async ({ issueIdOrKey, timeSpent, comment, started }) => {
        const body: any = {
          timeSpent
        };

        if (comment) {
          body.comment = {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: comment }]
              }
            ]
          };
        }

        if (started) body.started = started;

        const result = await makeJiraRequest(`/issue/${issueIdOrKey}/worklog`, 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== SPRINT TOOLS ====================

    server.registerTool(
      'get_board_sprints',
      {
        title: 'Get Board Sprints',
        description: 'Get all sprints for a board',
        inputSchema: {
          boardId: z.number().describe('Board ID'),
          state: z.string().optional().describe('Sprint state filter (active, closed, future)')
        }
      },
      async ({ boardId, state }) => {
        let endpoint = `/board/${boardId}/sprint`;
        if (state) {
          endpoint += `?state=${state}`;
        }
        // Use agile API
        const url = `https://api.atlassian.com/ex/jira/${config.cloud_id}/rest/agile/1.0${endpoint}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Jira API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_sprint_issues',
      {
        title: 'Get Sprint Issues',
        description: 'Get all issues in a sprint',
        inputSchema: {
          sprintId: z.number().describe('Sprint ID'),
          maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
        }
      },
      async ({ sprintId, maxResults = 50 }) => {
        const url = `https://api.atlassian.com/ex/jira/${config.cloud_id}/rest/agile/1.0/sprint/${sprintId}/issue?maxResults=${maxResults}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Jira API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== BOARD TOOLS ====================

    server.registerTool(
      'list_boards',
      {
        title: 'List Boards',
        description: 'Get all boards',
        inputSchema: {
          projectKeyOrId: z.string().optional().describe('Filter by project key or ID'),
          type: z.string().optional().describe('Board type (scrum, kanban)'),
          maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
        }
      },
      async ({ projectKeyOrId, type, maxResults = 50 }) => {
        let endpoint = `/board?maxResults=${maxResults}`;
        if (projectKeyOrId) endpoint += `&projectKeyOrId=${projectKeyOrId}`;
        if (type) endpoint += `&type=${type}`;

        const url = `https://api.atlassian.com/ex/jira/${config.cloud_id}/rest/agile/1.0${endpoint}`;

        const response = await fetch(url, {
          headers: {
            Authorization: `Bearer ${config.token}`,
            Accept: 'application/json'
          }
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Jira API error: ${response.status} - ${errorText}`);
        }

        const result = await response.json();
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== USER TOOLS ====================

    server.registerTool(
      'search_users',
      {
        title: 'Search Users',
        description: 'Search for users',
        inputSchema: {
          query: z.string().describe('Search query (name or email)'),
          maxResults: z.number().optional().describe('Maximum number of results (default: 50)')
        }
      },
      async ({ query, maxResults = 50 }) => {
        const result = await makeJiraRequest(
          `/user/search?query=${encodeURIComponent(query)}&maxResults=${maxResults}`
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
        description: 'Get information about the authenticated user',
        inputSchema: {}
      },
      async () => {
        const result = await makeJiraRequest('/myself');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== FILTER TOOLS ====================

    server.registerTool(
      'get_favorite_filters',
      {
        title: 'Get Favorite Filters',
        description: "Get the current user's favorite filters",
        inputSchema: {}
      },
      async () => {
        const result = await makeJiraRequest('/filter/favourite');
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'get_filter',
      {
        title: 'Get Filter',
        description: 'Get details of a specific filter',
        inputSchema: {
          filterId: z.string().describe('Filter ID')
        }
      },
      async ({ filterId }) => {
        const result = await makeJiraRequest(`/filter/${filterId}`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    // ==================== ATTACHMENT TOOLS ====================

    server.registerTool(
      'get_attachments',
      {
        title: 'Get Issue Attachments',
        description: 'Get metadata for all attachments on an issue',
        inputSchema: {
          issueIdOrKey: z.string().describe('Issue ID or key')
        }
      },
      async ({ issueIdOrKey }) => {
        const issue: any = await makeJiraRequest(`/issue/${issueIdOrKey}?fields=attachment`);
        return {
          content: [{ type: 'text', text: JSON.stringify(issue.fields.attachment, null, 2) }]
        };
      }
    );

    // ==================== VERSION TOOLS ====================

    server.registerTool(
      'get_project_versions',
      {
        title: 'Get Project Versions',
        description: 'Get all versions/releases for a project',
        inputSchema: {
          projectIdOrKey: z.string().describe('Project ID or key')
        }
      },
      async ({ projectIdOrKey }) => {
        const result = await makeJiraRequest(`/project/${projectIdOrKey}/versions`);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );

    server.registerTool(
      'create_version',
      {
        title: 'Create Version',
        description: 'Create a new version/release in a project',
        inputSchema: {
          projectId: z.string().describe('Project ID'),
          name: z.string().describe('Version name'),
          description: z.string().optional().describe('Version description'),
          releaseDate: z.string().optional().describe('Release date (YYYY-MM-DD)'),
          released: z.boolean().optional().describe('Whether version is released')
        }
      },
      async input => {
        const body: any = {
          name: input.name,
          projectId: input.projectId
        };

        if (input.description) body.description = input.description;
        if (input.releaseDate) body.releaseDate = input.releaseDate;
        if (input.released !== undefined) body.released = input.released;

        const result = await makeJiraRequest('/version', 'POST', body);
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      }
    );
  }
);
