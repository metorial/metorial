import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * GitLab MCP Server
 * Provides tools and resources for interacting with GitLab repositories, issues, and merge requests
 */

interface Config {
  token: string;
  gitlabUrl: string;
}

metorial.createServer<Config>(
  {
    name: 'gitlab-server',
    version: '1.0.0'
  },
  async (server, config) => {
    // Helper function to make GitLab API requests
    async function gitlabRequest(endpoint: string, options: RequestInit = {}): Promise<any> {
      const url = `${config.gitlabUrl}/api/v4${endpoint}`;
      const headers = {
        'PRIVATE-TOKEN': config.token,
        'Content-Type': 'application/json',
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `GitLab API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      return await response.text();
    }

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Resource: Project details
     * URI: gitlab://project/{projectId}
     */
    server.registerResource(
      'project',
      new ResourceTemplate('gitlab://project/{projectId}', { list: undefined }),
      {
        title: 'GitLab Project',
        description: 'Get details of a specific GitLab project'
      },
      async (uri, { projectId }) => {
        const project = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(project, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: File content from repository
     * URI: gitlab://project/{projectId}/file/{filePath}
     */
    server.registerResource(
      'file',
      new ResourceTemplate('gitlab://project/{projectId}/file/{filePath}', {
        list: undefined
      }),
      {
        title: 'Repository File',
        description: 'Get file content from a GitLab repository'
      },
      async (uri, { projectId, filePath }) => {
        const ref = uri.searchParams.get('ref') || 'main';
        const encodedPath = encodeURIComponent(filePath as string);
        const file = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/repository/files/${encodedPath}?ref=${ref}`
        );

        // Decode base64 content
        const content = file.encoding === 'base64' ? atob(file.content) : file.content;

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
     * Resource: Directory tree
     * URI: gitlab://project/{projectId}/tree/{path}
     */
    server.registerResource(
      'tree',
      new ResourceTemplate('gitlab://project/{projectId}/tree/{path}', { list: undefined }),
      {
        title: 'Repository Tree',
        description: 'Get directory listing from a GitLab repository'
      },
      async (uri, { projectId, path }) => {
        const ref = uri.searchParams.get('ref') || 'main';
        const tree = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/repository/tree?path=${encodeURIComponent(path as string)}&ref=${ref}`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(tree, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Repository branches
     * URI: gitlab://project/{projectId}/branches
     */
    server.registerResource(
      'branches',
      new ResourceTemplate('gitlab://project/{projectId}/branches', { list: undefined }),
      {
        title: 'Repository Branches',
        description: 'List all branches in a GitLab repository'
      },
      async (uri, { projectId }) => {
        const branches = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/repository/branches`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(branches, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Commit history
     * URI: gitlab://project/{projectId}/commits
     */
    server.registerResource(
      'commits',
      new ResourceTemplate('gitlab://project/{projectId}/commits', { list: undefined }),
      {
        title: 'Repository Commits',
        description: 'Get commit history from a GitLab repository'
      },
      async (uri, { projectId }) => {
        const ref = uri.searchParams.get('ref') || 'main';
        const commits = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/repository/commits?ref_name=${ref}`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(commits, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Issue details
     * URI: gitlab://project/{projectId}/issue/{issueIid}
     */
    server.registerResource(
      'issue',
      new ResourceTemplate('gitlab://project/{projectId}/issue/{issueIid}', {
        list: undefined
      }),
      {
        title: 'GitLab Issue',
        description: 'Get details of a specific issue'
      },
      async (uri, { projectId, issueIid }) => {
        const issue = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/issues/${issueIid}`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(issue, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Issue notes/comments
     * URI: gitlab://project/{projectId}/issue/{issueIid}/notes
     */
    server.registerResource(
      'issue-notes',
      new ResourceTemplate('gitlab://project/{projectId}/issue/{issueIid}/notes', {
        list: undefined
      }),
      {
        title: 'Issue Notes',
        description: 'Get comments/notes on an issue'
      },
      async (uri, { projectId, issueIid }) => {
        const notes = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/issues/${issueIid}/notes`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(notes, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Merge request details
     * URI: gitlab://project/{projectId}/merge-request/{mergeRequestIid}
     */
    server.registerResource(
      'merge-request',
      new ResourceTemplate('gitlab://project/{projectId}/merge-request/{mergeRequestIid}', {
        list: undefined
      }),
      {
        title: 'GitLab Merge Request',
        description: 'Get details of a specific merge request'
      },
      async (uri, { projectId, mergeRequestIid }) => {
        const mr = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests/${mergeRequestIid}`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(mr, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Merge request notes/comments
     * URI: gitlab://project/{projectId}/merge-request/{mergeRequestIid}/notes
     */
    server.registerResource(
      'merge-request-notes',
      new ResourceTemplate(
        'gitlab://project/{projectId}/merge-request/{mergeRequestIid}/notes',
        { list: undefined }
      ),
      {
        title: 'Merge Request Notes',
        description: 'Get comments/notes on a merge request'
      },
      async (uri, { projectId, mergeRequestIid }) => {
        const notes = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests/${mergeRequestIid}/notes`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(notes, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Resource: Merge request changes/diff
     * URI: gitlab://project/{projectId}/merge-request/{mergeRequestIid}/changes
     */
    server.registerResource(
      'merge-request-changes',
      new ResourceTemplate(
        'gitlab://project/{projectId}/merge-request/{mergeRequestIid}/changes',
        { list: undefined }
      ),
      {
        title: 'Merge Request Changes',
        description: 'Get diff/changes for a merge request'
      },
      async (uri, { projectId, mergeRequestIid }) => {
        const changes = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests/${mergeRequestIid}/changes`
        );
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(changes, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - PROJECT/REPOSITORY
    // ============================================================================

    /**
     * Tool: List projects
     */
    server.registerTool(
      'list_projects',
      {
        title: 'List Projects',
        description: 'List accessible GitLab projects with optional filters',
        inputSchema: {
          search: z.string().optional().describe('Search query to filter projects'),
          membership: z.boolean().optional().describe('Limit to projects user is a member of'),
          starred: z.boolean().optional().describe('Limit to starred projects'),
          visibility: z
            .enum(['public', 'internal', 'private'])
            .optional()
            .describe('Filter by visibility'),
          per_page: z
            .number()
            .min(1)
            .max(100)
            .default(20)
            .describe('Number of results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ search, membership, starred, visibility, per_page, page }) => {
        const params = new URLSearchParams();
        if (search) params.append('search', search);
        if (membership) params.append('membership', 'true');
        if (starred) params.append('starred', 'true');
        if (visibility) params.append('visibility', visibility);
        params.append('per_page', per_page.toString());
        params.append('page', page.toString());

        const projects = await gitlabRequest(`/projects?${params.toString()}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Search projects
     */
    server.registerTool(
      'search_projects',
      {
        title: 'Search Projects',
        description: 'Search for projects by name or description',
        inputSchema: {
          query: z.string().describe('Search query'),
          per_page: z
            .number()
            .min(1)
            .max(100)
            .default(20)
            .describe('Number of results per page')
        }
      },
      async ({ query, per_page }) => {
        const projects = await gitlabRequest(
          `/projects?search=${encodeURIComponent(query)}&per_page=${per_page}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(projects, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Get project languages
     */
    server.registerTool(
      'get_project_languages',
      {
        title: 'Get Project Languages',
        description: 'Get programming languages used in a project',
        inputSchema: {
          projectId: z.string().describe('Project ID or path')
        }
      },
      async ({ projectId }) => {
        const languages = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/languages`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(languages, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Compare branches
     */
    server.registerTool(
      'compare_branches',
      {
        title: 'Compare Branches',
        description: 'Compare two branches or commits',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          from: z.string().describe('Source branch or commit'),
          to: z.string().describe('Target branch or commit')
        }
      },
      async ({ projectId, from, to }) => {
        const comparison = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId
          )}/repository/compare?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(comparison, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - FILE/CONTENT
    // ============================================================================

    /**
     * Tool: Search code
     */
    server.registerTool(
      'search_code',
      {
        title: 'Search Code',
        description: 'Search for code across projects',
        inputSchema: {
          query: z.string().describe('Search query'),
          projectId: z.string().optional().describe('Limit search to specific project'),
          ref: z.string().optional().describe('Branch or tag name'),
          per_page: z
            .number()
            .min(1)
            .max(100)
            .default(20)
            .describe('Number of results per page')
        }
      },
      async ({ query, projectId, ref, per_page }) => {
        const params = new URLSearchParams();
        params.append('scope', 'blobs');
        params.append('search', query);
        params.append('per_page', per_page.toString());
        if (projectId) params.append('project_id', projectId);
        if (ref) params.append('ref', ref);

        const results = await gitlabRequest(`/search?${params.toString()}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Get file blame
     */
    server.registerTool(
      'get_file_blame',
      {
        title: 'Get File Blame',
        description: 'Get git blame information for a file',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          filePath: z.string().describe('Path to the file'),
          ref: z.string().optional().default('main').describe('Branch or commit')
        }
      },
      async ({ projectId, filePath, ref }) => {
        const blame = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/repository/files/${encodeURIComponent(filePath)}/blame?ref=${ref}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(blame, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Create file
     */
    server.registerTool(
      'create_file',
      {
        title: 'Create File',
        description: 'Create a new file in a repository',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          filePath: z.string().describe('Path for the new file'),
          content: z.string().describe('File content'),
          commitMessage: z.string().describe('Commit message'),
          branch: z.string().describe('Branch name'),
          startBranch: z.string().optional().describe('Start branch for new branch'),
          authorEmail: z.string().optional().describe('Author email'),
          authorName: z.string().optional().describe('Author name')
        }
      },
      async ({
        projectId,
        filePath,
        content,
        commitMessage,
        branch,
        startBranch,
        authorEmail,
        authorName
      }) => {
        const body: any = {
          branch,
          content,
          commit_message: commitMessage
        };
        if (startBranch) body.start_branch = startBranch;
        if (authorEmail) body.author_email = authorEmail;
        if (authorName) body.author_name = authorName;

        const result = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/repository/files/${encodeURIComponent(filePath)}`,
          {
            method: 'POST',
            body: JSON.stringify(body)
          }
        );
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

    /**
     * Tool: Update file
     */
    server.registerTool(
      'update_file',
      {
        title: 'Update File',
        description: 'Update an existing file in a repository',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          filePath: z.string().describe('Path to the file'),
          content: z.string().describe('New file content'),
          commitMessage: z.string().describe('Commit message'),
          branch: z.string().describe('Branch name'),
          startBranch: z.string().optional().describe('Start branch for new branch'),
          authorEmail: z.string().optional().describe('Author email'),
          authorName: z.string().optional().describe('Author name')
        }
      },
      async ({
        projectId,
        filePath,
        content,
        commitMessage,
        branch,
        startBranch,
        authorEmail,
        authorName
      }) => {
        const body: any = {
          branch,
          content,
          commit_message: commitMessage
        };
        if (startBranch) body.start_branch = startBranch;
        if (authorEmail) body.author_email = authorEmail;
        if (authorName) body.author_name = authorName;

        const result = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/repository/files/${encodeURIComponent(filePath)}`,
          {
            method: 'PUT',
            body: JSON.stringify(body)
          }
        );
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

    /**
     * Tool: Delete file
     */
    server.registerTool(
      'delete_file',
      {
        title: 'Delete File',
        description: 'Delete a file from a repository',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          filePath: z.string().describe('Path to the file'),
          commitMessage: z.string().describe('Commit message'),
          branch: z.string().describe('Branch name'),
          startBranch: z.string().optional().describe('Start branch for new branch'),
          authorEmail: z.string().optional().describe('Author email'),
          authorName: z.string().optional().describe('Author name')
        }
      },
      async ({
        projectId,
        filePath,
        commitMessage,
        branch,
        startBranch,
        authorEmail,
        authorName
      }) => {
        const body: any = {
          branch,
          commit_message: commitMessage
        };
        if (startBranch) body.start_branch = startBranch;
        if (authorEmail) body.author_email = authorEmail;
        if (authorName) body.author_name = authorName;

        const result = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/repository/files/${encodeURIComponent(filePath)}`,
          {
            method: 'DELETE',
            body: JSON.stringify(body)
          }
        );
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
    // TOOLS - ISSUES
    // ============================================================================

    /**
     * Tool: List issues
     */
    server.registerTool(
      'list_issues',
      {
        title: 'List Issues',
        description: 'List issues for a project with optional filters',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          state: z.enum(['opened', 'closed', 'all']).optional().describe('Filter by state'),
          labels: z.string().optional().describe('Comma-separated list of label names'),
          assigneeId: z.number().optional().describe('Filter by assignee user ID'),
          authorId: z.number().optional().describe('Filter by author user ID'),
          search: z.string().optional().describe('Search query'),
          per_page: z
            .number()
            .min(1)
            .max(100)
            .default(20)
            .describe('Number of results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ projectId, state, labels, assigneeId, authorId, search, per_page, page }) => {
        const params = new URLSearchParams();
        if (state) params.append('state', state);
        if (labels) params.append('labels', labels);
        if (assigneeId) params.append('assignee_id', assigneeId.toString());
        if (authorId) params.append('author_id', authorId.toString());
        if (search) params.append('search', search);
        params.append('per_page', per_page.toString());
        params.append('page', page.toString());

        const issues = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/issues?${params.toString()}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issues, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Create issue
     */
    server.registerTool(
      'create_issue',
      {
        title: 'Create Issue',
        description: 'Create a new issue in a project',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          title: z.string().describe('Issue title'),
          description: z.string().optional().describe('Issue description'),
          labels: z.string().optional().describe('Comma-separated list of label names'),
          assigneeIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
          milestoneId: z.number().optional().describe('Milestone ID'),
          dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)')
        }
      },
      async ({ projectId, title, description, labels, assigneeIds, milestoneId, dueDate }) => {
        const body: any = { title };
        if (description) body.description = description;
        if (labels) body.labels = labels;
        if (assigneeIds) body.assignee_ids = assigneeIds;
        if (milestoneId) body.milestone_id = milestoneId;
        if (dueDate) body.due_date = dueDate;

        const issue = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/issues`,
          {
            method: 'POST',
            body: JSON.stringify(body)
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Update issue
     */
    server.registerTool(
      'update_issue',
      {
        title: 'Update Issue',
        description: 'Update an existing issue',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          issueIid: z.number().describe('Issue IID (internal ID)'),
          title: z.string().optional().describe('New title'),
          description: z.string().optional().describe('New description'),
          labels: z.string().optional().describe('Comma-separated list of label names'),
          assigneeIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
          milestoneId: z.number().optional().describe('Milestone ID'),
          dueDate: z.string().optional().describe('Due date (YYYY-MM-DD)'),
          stateEvent: z.enum(['close', 'reopen']).optional().describe('State change event')
        }
      },
      async ({
        projectId,
        issueIid,
        title,
        description,
        labels,
        assigneeIds,
        milestoneId,
        dueDate,
        stateEvent
      }) => {
        const body: any = {};
        if (title) body.title = title;
        if (description) body.description = description;
        if (labels) body.labels = labels;
        if (assigneeIds) body.assignee_ids = assigneeIds;
        if (milestoneId) body.milestone_id = milestoneId;
        if (dueDate) body.due_date = dueDate;
        if (stateEvent) body.state_event = stateEvent;

        const issue = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/issues/${issueIid}`,
          {
            method: 'PUT',
            body: JSON.stringify(body)
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(issue, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Close issue
     */
    server.registerTool(
      'close_issue',
      {
        title: 'Close Issue',
        description: 'Close an issue',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          issueIid: z.number().describe('Issue IID (internal ID)')
        }
      },
      async ({ projectId, issueIid }) => {
        const issue = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/issues/${issueIid}`,
          {
            method: 'PUT',
            body: JSON.stringify({ state_event: 'close' })
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Issue #${issueIid} closed successfully\n${JSON.stringify(issue, null, 2)}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Reopen issue
     */
    server.registerTool(
      'reopen_issue',
      {
        title: 'Reopen Issue',
        description: 'Reopen a closed issue',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          issueIid: z.number().describe('Issue IID (internal ID)')
        }
      },
      async ({ projectId, issueIid }) => {
        const issue = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/issues/${issueIid}`,
          {
            method: 'PUT',
            body: JSON.stringify({ state_event: 'reopen' })
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Issue #${issueIid} reopened successfully\n${JSON.stringify(
                issue,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Add issue comment
     */
    server.registerTool(
      'add_issue_comment',
      {
        title: 'Add Issue Comment',
        description: 'Add a comment/note to an issue',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          issueIid: z.number().describe('Issue IID (internal ID)'),
          body: z.string().describe('Comment text')
        }
      },
      async ({ projectId, issueIid, body }) => {
        const note = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/issues/${issueIid}/notes`,
          {
            method: 'POST',
            body: JSON.stringify({ body })
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(note, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Search issues
     */
    server.registerTool(
      'search_issues',
      {
        title: 'Search Issues',
        description: 'Search for issues across projects',
        inputSchema: {
          query: z.string().describe('Search query'),
          projectId: z.string().optional().describe('Limit search to specific project'),
          state: z.enum(['opened', 'closed', 'all']).optional().describe('Filter by state'),
          per_page: z
            .number()
            .min(1)
            .max(100)
            .default(20)
            .describe('Number of results per page')
        }
      },
      async ({ query, projectId, state, per_page }) => {
        const params = new URLSearchParams();
        params.append('scope', 'issues');
        params.append('search', query);
        params.append('per_page', per_page.toString());
        if (projectId) params.append('project_id', projectId);
        if (state) params.append('state', state);

        const results = await gitlabRequest(`/search?${params.toString()}`);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(results, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - MERGE REQUESTS
    // ============================================================================

    /**
     * Tool: List merge requests
     */
    server.registerTool(
      'list_merge_requests',
      {
        title: 'List Merge Requests',
        description: 'List merge requests for a project with optional filters',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          state: z
            .enum(['opened', 'closed', 'locked', 'merged', 'all'])
            .optional()
            .describe('Filter by state'),
          labels: z.string().optional().describe('Comma-separated list of label names'),
          authorId: z.number().optional().describe('Filter by author user ID'),
          assigneeId: z.number().optional().describe('Filter by assignee user ID'),
          sourceBranch: z.string().optional().describe('Filter by source branch'),
          targetBranch: z.string().optional().describe('Filter by target branch'),
          search: z.string().optional().describe('Search query'),
          per_page: z
            .number()
            .min(1)
            .max(100)
            .default(20)
            .describe('Number of results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({
        projectId,
        state,
        labels,
        authorId,
        assigneeId,
        sourceBranch,
        targetBranch,
        search,
        per_page,
        page
      }) => {
        const params = new URLSearchParams();
        if (state) params.append('state', state);
        if (labels) params.append('labels', labels);
        if (authorId) params.append('author_id', authorId.toString());
        if (assigneeId) params.append('assignee_id', assigneeId.toString());
        if (sourceBranch) params.append('source_branch', sourceBranch);
        if (targetBranch) params.append('target_branch', targetBranch);
        if (search) params.append('search', search);
        params.append('per_page', per_page.toString());
        params.append('page', page.toString());

        const mrs = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests?${params.toString()}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mrs, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Create merge request
     */
    server.registerTool(
      'create_merge_request',
      {
        title: 'Create Merge Request',
        description: 'Create a new merge request in a project',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          sourceBranch: z.string().describe('Source branch name'),
          targetBranch: z.string().describe('Target branch name'),
          title: z.string().describe('Merge request title'),
          description: z.string().optional().describe('Merge request description'),
          labels: z.string().optional().describe('Comma-separated list of label names'),
          assigneeIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
          milestoneId: z.number().optional().describe('Milestone ID'),
          removeSourceBranch: z
            .boolean()
            .optional()
            .describe('Remove source branch after merge')
        }
      },
      async ({
        projectId,
        sourceBranch,
        targetBranch,
        title,
        description,
        labels,
        assigneeIds,
        milestoneId,
        removeSourceBranch
      }) => {
        const body: any = {
          source_branch: sourceBranch,
          target_branch: targetBranch,
          title
        };
        if (description) body.description = description;
        if (labels) body.labels = labels;
        if (assigneeIds) body.assignee_ids = assigneeIds;
        if (milestoneId) body.milestone_id = milestoneId;
        if (removeSourceBranch !== undefined) body.remove_source_branch = removeSourceBranch;

        const mr = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/merge_requests`,
          {
            method: 'POST',
            body: JSON.stringify(body)
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mr, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Update merge request
     */
    server.registerTool(
      'update_merge_request',
      {
        title: 'Update Merge Request',
        description: 'Update an existing merge request',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          mergeRequestIid: z.number().describe('Merge request IID (internal ID)'),
          title: z.string().optional().describe('New title'),
          description: z.string().optional().describe('New description'),
          labels: z.string().optional().describe('Comma-separated list of label names'),
          assigneeIds: z.array(z.number()).optional().describe('Array of user IDs to assign'),
          milestoneId: z.number().optional().describe('Milestone ID'),
          targetBranch: z.string().optional().describe('New target branch'),
          stateEvent: z.enum(['close', 'reopen']).optional().describe('State change event'),
          removeSourceBranch: z
            .boolean()
            .optional()
            .describe('Remove source branch after merge')
        }
      },
      async ({
        projectId,
        mergeRequestIid,
        title,
        description,
        labels,
        assigneeIds,
        milestoneId,
        targetBranch,
        stateEvent,
        removeSourceBranch
      }) => {
        const body: any = {};
        if (title) body.title = title;
        if (description) body.description = description;
        if (labels) body.labels = labels;
        if (assigneeIds) body.assignee_ids = assigneeIds;
        if (milestoneId) body.milestone_id = milestoneId;
        if (targetBranch) body.target_branch = targetBranch;
        if (stateEvent) body.state_event = stateEvent;
        if (removeSourceBranch !== undefined) body.remove_source_branch = removeSourceBranch;

        const mr = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests/${mergeRequestIid}`,
          {
            method: 'PUT',
            body: JSON.stringify(body)
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(mr, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Merge merge request
     */
    server.registerTool(
      'merge_merge_request',
      {
        title: 'Merge Merge Request',
        description: 'Accept and merge a merge request',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          mergeRequestIid: z.number().describe('Merge request IID (internal ID)'),
          mergeCommitMessage: z.string().optional().describe('Custom merge commit message'),
          squash: z.boolean().optional().describe('Squash commits on merge'),
          shouldRemoveSourceBranch: z
            .boolean()
            .optional()
            .describe('Remove source branch after merge')
        }
      },
      async ({
        projectId,
        mergeRequestIid,
        mergeCommitMessage,
        squash,
        shouldRemoveSourceBranch
      }) => {
        const body: any = {};
        if (mergeCommitMessage) body.merge_commit_message = mergeCommitMessage;
        if (squash !== undefined) body.squash = squash;
        if (shouldRemoveSourceBranch !== undefined)
          body.should_remove_source_branch = shouldRemoveSourceBranch;

        const mr = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests/${mergeRequestIid}/merge`,
          {
            method: 'PUT',
            body: JSON.stringify(body)
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Merge request !${mergeRequestIid} merged successfully\n${JSON.stringify(
                mr,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Close merge request
     */
    server.registerTool(
      'close_merge_request',
      {
        title: 'Close Merge Request',
        description: 'Close a merge request without merging',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          mergeRequestIid: z.number().describe('Merge request IID (internal ID)')
        }
      },
      async ({ projectId, mergeRequestIid }) => {
        const mr = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests/${mergeRequestIid}`,
          {
            method: 'PUT',
            body: JSON.stringify({ state_event: 'close' })
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Merge request !${mergeRequestIid} closed successfully\n${JSON.stringify(
                mr,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Reopen merge request
     */
    server.registerTool(
      'reopen_merge_request',
      {
        title: 'Reopen Merge Request',
        description: 'Reopen a closed merge request',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          mergeRequestIid: z.number().describe('Merge request IID (internal ID)')
        }
      },
      async ({ projectId, mergeRequestIid }) => {
        const mr = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests/${mergeRequestIid}`,
          {
            method: 'PUT',
            body: JSON.stringify({ state_event: 'reopen' })
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Merge request !${mergeRequestIid} reopened successfully\n${JSON.stringify(
                mr,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Add merge request comment
     */
    server.registerTool(
      'add_merge_request_comment',
      {
        title: 'Add Merge Request Comment',
        description: 'Add a comment/note to a merge request',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          mergeRequestIid: z.number().describe('Merge request IID (internal ID)'),
          body: z.string().describe('Comment text')
        }
      },
      async ({ projectId, mergeRequestIid, body }) => {
        const note = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/merge_requests/${mergeRequestIid}/notes`,
          {
            method: 'POST',
            body: JSON.stringify({ body })
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(note, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Approve merge request
     */
    server.registerTool(
      'approve_merge_request',
      {
        title: 'Approve Merge Request',
        description: 'Approve a merge request',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          mergeRequestIid: z.number().describe('Merge request IID (internal ID)')
        }
      },
      async ({ projectId, mergeRequestIid }) => {
        const approval = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId
          )}/merge_requests/${mergeRequestIid}/approve`,
          {
            method: 'POST',
            body: JSON.stringify({})
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Merge request !${mergeRequestIid} approved successfully\n${JSON.stringify(
                approval,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    /**
     * Tool: Unapprove merge request
     */
    server.registerTool(
      'unapprove_merge_request',
      {
        title: 'Unapprove Merge Request',
        description: 'Remove approval from a merge request',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          mergeRequestIid: z.number().describe('Merge request IID (internal ID)')
        }
      },
      async ({ projectId, mergeRequestIid }) => {
        const approval = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId
          )}/merge_requests/${mergeRequestIid}/unapprove`,
          {
            method: 'POST',
            body: JSON.stringify({})
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Approval removed from merge request !${mergeRequestIid}\n${JSON.stringify(
                approval,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - BRANCHES
    // ============================================================================

    /**
     * Tool: Create branch
     */
    server.registerTool(
      'create_branch',
      {
        title: 'Create Branch',
        description: 'Create a new branch in a repository',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          branch: z.string().describe('Name of the new branch'),
          ref: z.string().describe('Branch name or commit SHA to create branch from')
        }
      },
      async ({ projectId, branch, ref }) => {
        const newBranch = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/repository/branches`,
          {
            method: 'POST',
            body: JSON.stringify({ branch, ref })
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(newBranch, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: Delete branch
     */
    server.registerTool(
      'delete_branch',
      {
        title: 'Delete Branch',
        description: 'Delete a branch from a repository',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          branch: z.string().describe('Name of the branch to delete')
        }
      },
      async ({ projectId, branch }) => {
        await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId as string
          )}/repository/branches/${encodeURIComponent(branch)}`,
          {
            method: 'DELETE'
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: `Branch '${branch}' deleted successfully`
            }
          ]
        };
      }
    );

    /**
     * Tool: Protect branch
     */
    server.registerTool(
      'protect_branch',
      {
        title: 'Protect Branch',
        description: 'Protect a branch from force pushes and deletion',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          branch: z.string().describe('Name of the branch to protect'),
          pushAccessLevel: z
            .enum(['0', '30', '40'])
            .optional()
            .describe('Push access level: 0=No access, 30=Developer, 40=Maintainer'),
          mergeAccessLevel: z
            .enum(['0', '30', '40'])
            .optional()
            .describe('Merge access level: 0=No access, 30=Developer, 40=Maintainer'),
          allowForcePush: z.boolean().optional().describe('Allow force push')
        }
      },
      async ({ projectId, branch, pushAccessLevel, mergeAccessLevel, allowForcePush }) => {
        const body: any = { name: branch };
        if (pushAccessLevel) body.push_access_level = parseInt(pushAccessLevel);
        if (mergeAccessLevel) body.merge_access_level = parseInt(mergeAccessLevel);
        if (allowForcePush !== undefined) body.allow_force_push = allowForcePush;

        const protected_branch = await gitlabRequest(
          `/projects/${encodeURIComponent(projectId as string)}/protected_branches`,
          {
            method: 'POST',
            body: JSON.stringify(body)
          }
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(protected_branch, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // TOOLS - USER/MEMBERS
    // ============================================================================

    /**
     * Tool: Get current user
     */
    server.registerTool(
      'get_current_user',
      {
        title: 'Get Current User',
        description: 'Get details of the currently authenticated user',
        inputSchema: {}
      },
      async () => {
        const user = await gitlabRequest('/user');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(user, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Tool: List project members
     */
    server.registerTool(
      'list_project_members',
      {
        title: 'List Project Members',
        description: 'List all members of a project',
        inputSchema: {
          projectId: z.string().describe('Project ID or path'),
          per_page: z
            .number()
            .min(1)
            .max(100)
            .default(20)
            .describe('Number of results per page'),
          page: z.number().min(1).default(1).describe('Page number')
        }
      },
      async ({ projectId, per_page, page }) => {
        const members = await gitlabRequest(
          `/projects/${encodeURIComponent(
            projectId
          )}/members?per_page=${per_page}&page=${page}`
        );
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(members, null, 2)
            }
          ]
        };
      }
    );
  }
);
