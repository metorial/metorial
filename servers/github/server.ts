import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * GitHub MCP Server
 * Provides tools and resources for interacting with GitHub via the REST API
 */

metorial.setOauthHandler({
  getAuthForm: () => ({
    fields: []
  }),
  getAuthorizationUrl: async input => {
    const scopes = ['repo', 'user', 'read:org', 'write:discussion', 'gist'].join(' ');

    const params = new URLSearchParams({
      client_id: input.clientId,
      redirect_uri: input.redirectUri,
      scope: scopes,
      state: input.state
    });

    return {
      authorizationUrl: `https://github.com/login/oauth/authorize?${params.toString()}`
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
        client_id: input.clientId,
        client_secret: input.clientSecret,
        code: code,
        redirect_uri: input.redirectUri
      });

      const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: tokenParams.toString()
      });

      if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Token exchange failed: ${errorText}`);
      }

      const tokenData = (await tokenResponse.json()) as any;

      if (tokenData.error) {
        throw new Error(
          `GitHub OAuth error: ${tokenData.error_description || tokenData.error}`
        );
      }

      return {
        access_token: tokenData.access_token,
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
    name: 'github-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // ============================================================================
    // Helper Functions
    // ============================================================================

    /**
     * Makes an authenticated request to the GitHub API
     */
    async function githubRequest(
      endpoint: string,
      method: string = 'GET',
      body?: unknown
    ): Promise<any> {
      const url = `https://api.github.com${endpoint}`;
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.token}`,
        Accept: 'application/vnd.github.v3+json',
        'User-Agent': 'GitHub-MCP-Server'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body) {
        headers['Content-Type'] = 'application/json';
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`GitHub API error (${response.status}): ${errorText}`);
      }

      // Handle 204 No Content responses
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    }

    /**
     * Formats GitHub data as readable text
     */
    function formatAsText(data: any): string {
      return JSON.stringify(data, null, 2);
    }

    // ============================================================================
    // Resources
    // ============================================================================

    /**
     * Repository Resource
     * URI: github://repository/{owner}/{repo}
     */
    server.registerResource(
      'repository',
      new ResourceTemplate('github://repository/{owner}/{repo}', { list: undefined }),
      {
        title: 'GitHub Repository',
        description: 'Access repository details and metadata'
      },
      async (uri, { owner, repo }) => {
        const data = await githubRequest(`/repos/${owner}/${repo}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * Repository File Content Resource
     * URI: github://repository/{owner}/{repo}/file/{path}
     */
    server.registerResource(
      'repository-file',
      new ResourceTemplate('github://repository/{owner}/{repo}/file/{path}', {
        list: undefined
      }),
      {
        title: 'GitHub File Content',
        description: 'Access file content from a repository'
      },
      async (uri, { owner, repo, path }) => {
        const data = await githubRequest(`/repos/${owner}/${repo}/contents/${path}`);

        // Decode base64 content if present
        let content = formatAsText(data);
        if (data.content && data.encoding === 'base64') {
          try {
            const decoded = atob(data.content.replace(/\n/g, ''));
            content = `File: ${data.path}\nSize: ${data.size} bytes\nSHA: ${data.sha}\n\n${decoded}`;
          } catch (e) {
            content = formatAsText(data);
          }
        }

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/plain',
              text: content
            }
          ]
        };
      }
    );

    /**
     * Issue Resource
     * URI: github://issue/{owner}/{repo}/{issue_number}
     */
    server.registerResource(
      'issue',
      new ResourceTemplate('github://issue/{owner}/{repo}/{issue_number}', {
        list: undefined
      }),
      {
        title: 'GitHub Issue',
        description: 'Access specific issue details'
      },
      async (uri, { owner, repo, issue_number }) => {
        const issue = await githubRequest(`/repos/${owner}/${repo}/issues/${issue_number}`);
        const comments = await githubRequest(
          `/repos/${owner}/${repo}/issues/${issue_number}/comments`
        );

        const fullData = {
          ...issue,
          comments_data: comments
        };

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatAsText(fullData)
            }
          ]
        };
      }
    );

    /**
     * Pull Request Resource
     * URI: github://pull/{owner}/{repo}/{pull_number}
     */
    server.registerResource(
      'pull-request',
      new ResourceTemplate('github://pull/{owner}/{repo}/{pull_number}', { list: undefined }),
      {
        title: 'GitHub Pull Request',
        description: 'Access specific pull request details'
      },
      async (uri, { owner, repo, pull_number }) => {
        const pr = await githubRequest(`/repos/${owner}/${repo}/pulls/${pull_number}`);
        const reviews = await githubRequest(
          `/repos/${owner}/${repo}/pulls/${pull_number}/reviews`
        );
        const comments = await githubRequest(
          `/repos/${owner}/${repo}/pulls/${pull_number}/comments`
        );

        const fullData = {
          ...pr,
          reviews_data: reviews,
          comments_data: comments
        };

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatAsText(fullData)
            }
          ]
        };
      }
    );

    /**
     * User/Organization Resource
     * URI: github://user/{username}
     */
    server.registerResource(
      'user',
      new ResourceTemplate('github://user/{username}', { list: undefined }),
      {
        title: 'GitHub User/Organization',
        description: 'Access user or organization profile information'
      },
      async (uri, { username }) => {
        const data = await githubRequest(`/users/${username}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * Repository Branch Resource
     * URI: github://repository/{owner}/{repo}/branch/{branch}
     */
    server.registerResource(
      'branch',
      new ResourceTemplate('github://repository/{owner}/{repo}/branch/{branch}', {
        list: undefined
      }),
      {
        title: 'GitHub Branch',
        description: 'Access information about a specific branch'
      },
      async (uri, { owner, repo, branch }) => {
        const data = await githubRequest(`/repos/${owner}/${repo}/branches/${branch}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    // ============================================================================
    // Tools
    // ============================================================================

    /**
     * List Repositories
     */
    server.registerTool(
      'list_repositories',
      {
        title: 'List Repositories',
        description: 'List repositories for a user/organization or search repositories',
        inputSchema: {
          username: z.string().optional().describe('GitHub username or organization'),
          search_query: z.string().optional().describe('Search query for repositories'),
          sort: z
            .enum(['created', 'updated', 'pushed', 'full_name', 'stars'])
            .optional()
            .describe('Sort order'),
          per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ username, search_query, sort, per_page, page }) => {
        let data;

        if (search_query) {
          // Search repositories
          const params = new URLSearchParams({
            q: search_query,
            per_page: String(per_page),
            page: String(page)
          });
          if (sort) params.append('sort', sort);

          data = await githubRequest(`/search/repositories?${params}`);
        } else if (username) {
          // List user/org repositories
          const params = new URLSearchParams({
            per_page: String(per_page),
            page: String(page)
          });
          if (sort) params.append('sort', sort);

          data = await githubRequest(`/users/${username}/repos?${params}`);
        } else {
          // List authenticated user's repositories
          const params = new URLSearchParams({
            per_page: String(per_page),
            page: String(page)
          });
          if (sort) params.append('sort', sort);

          data = await githubRequest(`/user/repos?${params}`);
        }

        return {
          content: [
            {
              type: 'text',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * List Issues
     */
    server.registerTool(
      'list_issues',
      {
        title: 'List Issues',
        description: 'List issues for a repository with filtering options',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          state: z.enum(['open', 'closed', 'all']).default('open').describe('Issue state'),
          labels: z.string().optional().describe('Comma-separated list of labels'),
          sort: z.enum(['created', 'updated', 'comments']).optional().describe('Sort order'),
          per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ owner, repo, state, labels, sort, per_page, page }) => {
        const params = new URLSearchParams({
          state,
          per_page: String(per_page),
          page: String(page)
        });
        if (labels) params.append('labels', labels);
        if (sort) params.append('sort', sort);

        const data = await githubRequest(`/repos/${owner}/${repo}/issues?${params}`);

        return {
          content: [
            {
              type: 'text',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * List Pull Requests
     */
    server.registerTool(
      'list_pull_requests',
      {
        title: 'List Pull Requests',
        description: 'List pull requests for a repository',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          state: z
            .enum(['open', 'closed', 'all'])
            .default('open')
            .describe('Pull request state'),
          sort: z
            .enum(['created', 'updated', 'popularity', 'long-running'])
            .optional()
            .describe('Sort order'),
          per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ owner, repo, state, sort, per_page, page }) => {
        const params = new URLSearchParams({
          state,
          per_page: String(per_page),
          page: String(page)
        });
        if (sort) params.append('sort', sort);

        const data = await githubRequest(`/repos/${owner}/${repo}/pulls?${params}`);

        return {
          content: [
            {
              type: 'text',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * Create Issue
     */
    server.registerTool(
      'create_issue',
      {
        title: 'Create Issue',
        description: 'Create a new issue in a repository',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          title: z.string().describe('Issue title'),
          body: z.string().optional().describe('Issue body/description'),
          labels: z.array(z.string()).optional().describe('Array of label names'),
          assignees: z.array(z.string()).optional().describe('Array of usernames to assign')
        }
      },
      async ({ owner, repo, title, body, labels, assignees }) => {
        const payload: any = { title };
        if (body) payload.body = body;
        if (labels) payload.labels = labels;
        if (assignees) payload.assignees = assignees;

        const data = await githubRequest(`/repos/${owner}/${repo}/issues`, 'POST', payload);

        return {
          content: [
            {
              type: 'text',
              text: `Issue created successfully: #${data.number}\n\n${formatAsText(data)}`
            }
          ]
        };
      }
    );

    /**
     * Update Issue
     */
    server.registerTool(
      'update_issue',
      {
        title: 'Update Issue',
        description: 'Update an existing issue',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          issue_number: z.number().describe('Issue number'),
          title: z.string().optional().describe('New issue title'),
          body: z.string().optional().describe('New issue body'),
          state: z.enum(['open', 'closed']).optional().describe('New issue state'),
          labels: z.array(z.string()).optional().describe('Array of label names'),
          assignees: z.array(z.string()).optional().describe('Array of usernames to assign')
        }
      },
      async ({ owner, repo, issue_number, title, body, state, labels, assignees }) => {
        const payload: any = {};
        if (title) payload.title = title;
        if (body) payload.body = body;
        if (state) payload.state = state;
        if (labels) payload.labels = labels;
        if (assignees) payload.assignees = assignees;

        const data = await githubRequest(
          `/repos/${owner}/${repo}/issues/${issue_number}`,
          'PATCH',
          payload
        );

        return {
          content: [
            {
              type: 'text',
              text: `Issue updated successfully: #${data.number}\n\n${formatAsText(data)}`
            }
          ]
        };
      }
    );

    /**
     * Create Issue Comment
     */
    server.registerTool(
      'create_issue_comment',
      {
        title: 'Create Issue Comment',
        description: 'Add a comment to an issue',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          issue_number: z.number().describe('Issue number'),
          body: z.string().describe('Comment body')
        }
      },
      async ({ owner, repo, issue_number, body }) => {
        const data = await githubRequest(
          `/repos/${owner}/${repo}/issues/${issue_number}/comments`,
          'POST',
          { body }
        );

        return {
          content: [
            {
              type: 'text',
              text: `Comment added successfully to issue #${issue_number}\n\n${formatAsText(
                data
              )}`
            }
          ]
        };
      }
    );

    /**
     * Create Pull Request
     */
    server.registerTool(
      'create_pull_request',
      {
        title: 'Create Pull Request',
        description: 'Create a new pull request',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          title: z.string().describe('Pull request title'),
          body: z.string().optional().describe('Pull request body/description'),
          head: z.string().describe('The name of the branch where your changes are'),
          base: z.string().describe('The name of the branch you want to merge into'),
          draft: z.boolean().optional().describe('Create as draft pull request')
        }
      },
      async ({ owner, repo, title, body, head, base, draft }) => {
        const payload: any = { title, head, base };
        if (body) payload.body = body;
        if (draft !== undefined) payload.draft = draft;

        const data = await githubRequest(`/repos/${owner}/${repo}/pulls`, 'POST', payload);

        return {
          content: [
            {
              type: 'text',
              text: `Pull request created successfully: #${data.number}\n\n${formatAsText(
                data
              )}`
            }
          ]
        };
      }
    );

    /**
     * Update Pull Request
     */
    server.registerTool(
      'update_pull_request',
      {
        title: 'Update Pull Request',
        description: 'Update an existing pull request',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          pull_number: z.number().describe('Pull request number'),
          title: z.string().optional().describe('New pull request title'),
          body: z.string().optional().describe('New pull request body'),
          state: z.enum(['open', 'closed']).optional().describe('New pull request state')
        }
      },
      async ({ owner, repo, pull_number, title, body, state }) => {
        const payload: any = {};
        if (title) payload.title = title;
        if (body) payload.body = body;
        if (state) payload.state = state;

        const data = await githubRequest(
          `/repos/${owner}/${repo}/pulls/${pull_number}`,
          'PATCH',
          payload
        );

        return {
          content: [
            {
              type: 'text',
              text: `Pull request updated successfully: #${data.number}\n\n${formatAsText(
                data
              )}`
            }
          ]
        };
      }
    );

    /**
     * Create Pull Request Review
     */
    server.registerTool(
      'create_pull_request_review',
      {
        title: 'Create Pull Request Review',
        description: 'Create a review on a pull request',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          pull_number: z.number().describe('Pull request number'),
          body: z.string().optional().describe('Review body'),
          event: z.enum(['APPROVE', 'REQUEST_CHANGES', 'COMMENT']).describe('Review action'),
          comments: z
            .array(
              z.object({
                path: z.string().describe('File path'),
                position: z
                  .number()
                  .optional()
                  .describe('Position in diff (deprecated, use line)'),
                body: z.string().describe('Comment body'),
                line: z.number().optional().describe('Line number in the file'),
                side: z.enum(['LEFT', 'RIGHT']).optional().describe('Side of the diff')
              })
            )
            .optional()
            .describe('Line comments for the review')
        }
      },
      async ({ owner, repo, pull_number, body, event, comments }) => {
        const payload: any = { event };
        if (body) payload.body = body;
        if (comments) payload.comments = comments;

        const data = await githubRequest(
          `/repos/${owner}/${repo}/pulls/${pull_number}/reviews`,
          'POST',
          payload
        );

        return {
          content: [
            {
              type: 'text',
              text: `Review created successfully on PR #${pull_number}\n\n${formatAsText(
                data
              )}`
            }
          ]
        };
      }
    );

    /**
     * List Commits
     */
    server.registerTool(
      'list_commits',
      {
        title: 'List Commits',
        description: 'List commits in a repository',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          sha: z.string().optional().describe('SHA or branch to start listing from'),
          per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ owner, repo, sha, per_page, page }) => {
        const params = new URLSearchParams({
          per_page: String(per_page),
          page: String(page)
        });
        if (sha) params.append('sha', sha);

        const data = await githubRequest(`/repos/${owner}/${repo}/commits?${params}`);

        return {
          content: [
            {
              type: 'text',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * List Branches
     */
    server.registerTool(
      'list_branches',
      {
        title: 'List Branches',
        description: 'List branches in a repository',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ owner, repo, per_page, page }) => {
        const params = new URLSearchParams({
          per_page: String(per_page),
          page: String(page)
        });

        const data = await githubRequest(`/repos/${owner}/${repo}/branches?${params}`);

        return {
          content: [
            {
              type: 'text',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * Create Repository
     */
    server.registerTool(
      'create_repository',
      {
        title: 'Create Repository',
        description: 'Create a new repository for the authenticated user',
        inputSchema: {
          name: z.string().describe('Repository name'),
          description: z.string().optional().describe('Repository description'),
          private: z.boolean().default(false).describe('Make repository private'),
          auto_init: z.boolean().optional().describe('Initialize with README')
        }
      },
      async ({ name, description, private: isPrivate, auto_init }) => {
        const payload: any = { name, private: isPrivate };
        if (description) payload.description = description;
        if (auto_init !== undefined) payload.auto_init = auto_init;

        const data = await githubRequest('/user/repos', 'POST', payload);

        return {
          content: [
            {
              type: 'text',
              text: `Repository created successfully: ${data.full_name}\n\n${formatAsText(
                data
              )}`
            }
          ]
        };
      }
    );

    /**
     * Search Code
     */
    server.registerTool(
      'search_code',
      {
        title: 'Search Code',
        description: 'Search for code across GitHub repositories',
        inputSchema: {
          query: z.string().describe('Search query (e.g., "console.log repo:owner/name")'),
          sort: z.enum(['indexed']).optional().describe('Sort order'),
          order: z.enum(['asc', 'desc']).optional().describe('Sort direction'),
          per_page: z.number().min(1).max(100).default(30).describe('Results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ query, sort, order, per_page, page }) => {
        const params = new URLSearchParams({
          q: query,
          per_page: String(per_page),
          page: String(page)
        });
        if (sort) params.append('sort', sort);
        if (order) params.append('order', order);

        const data = await githubRequest(`/search/code?${params}`);

        return {
          content: [
            {
              type: 'text',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * List Repository Contents
     */
    server.registerTool(
      'list_repository_contents',
      {
        title: 'List Repository Contents',
        description: 'List contents of a directory in a repository',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          path: z.string().default('').describe('Directory path (empty for root)'),
          ref: z.string().optional().describe('Branch, tag, or commit SHA')
        }
      },
      async ({ owner, repo, path, ref }) => {
        const params = new URLSearchParams();
        if (ref) params.append('ref', ref);

        const queryString = params.toString();
        const endpoint = `/repos/${owner}/${repo}/contents/${path}${
          queryString ? '?' + queryString : ''
        }`;
        const data = await githubRequest(endpoint);

        return {
          content: [
            {
              type: 'text',
              text: formatAsText(data)
            }
          ]
        };
      }
    );

    /**
     * Create or Update File
     */
    server.registerTool(
      'create_or_update_file',
      {
        title: 'Create or Update File',
        description: 'Create or update a file in a repository',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          path: z.string().describe('File path'),
          message: z.string().describe('Commit message'),
          content: z.string().describe('File content (will be base64 encoded)'),
          branch: z.string().optional().describe('Branch to commit to'),
          sha: z
            .string()
            .optional()
            .describe('Blob SHA of the file being replaced (required for updates)')
        }
      },
      async ({ owner, repo, path, message, content, branch, sha }) => {
        // Encode content to base64
        const encodedContent = btoa(content);

        const payload: any = {
          message,
          content: encodedContent
        };
        if (branch) payload.branch = branch;
        if (sha) payload.sha = sha;

        const data = await githubRequest(
          `/repos/${owner}/${repo}/contents/${path}`,
          'PUT',
          payload
        );

        return {
          content: [
            {
              type: 'text',
              text: `File ${
                sha ? 'updated' : 'created'
              } successfully: ${path}\n\n${formatAsText(data)}`
            }
          ]
        };
      }
    );

    /**
     * Fork Repository
     */
    server.registerTool(
      'fork_repository',
      {
        title: 'Fork Repository',
        description: 'Fork a repository',
        inputSchema: {
          owner: z.string().describe('Repository owner'),
          repo: z.string().describe('Repository name'),
          organization: z.string().optional().describe('Organization to fork to (optional)')
        }
      },
      async ({ owner, repo, organization }) => {
        const payload: any = {};
        if (organization) payload.organization = organization;

        const data = await githubRequest(
          `/repos/${owner}/${repo}/forks`,
          'POST',
          Object.keys(payload).length > 0 ? payload : undefined
        );

        return {
          content: [
            {
              type: 'text',
              text: `Repository forked successfully: ${data.full_name}\n\n${formatAsText(
                data
              )}`
            }
          ]
        };
      }
    );
  }
);
