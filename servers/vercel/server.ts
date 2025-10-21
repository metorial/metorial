import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Vercel MCP Server
 * Provides tools and resources for managing Vercel projects, deployments, domains, and more.
 */

metorial.createServer<{ token: string }>(
  {
    name: 'vercel-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    const VERCEL_API_BASE = 'https://api.vercel.com';

    /**
     * Helper function to make authenticated requests to Vercel API
     */
    async function vercelRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
      const url = `${VERCEL_API_BASE}${endpoint}`;
      const headers = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/json',
        ...options.headers
      };

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Vercel API error (${response.status}): ${errorText}`);
      }

      return (await response.json()) as T;
    }

    // ==================== RESOURCES ====================

    /**
     * Project Resource
     * Access detailed information about a specific Vercel project
     */
    server.registerResource(
      'project',
      new ResourceTemplate('vercel://project/{projectId}', { list: undefined }),
      {
        title: 'Vercel Project',
        description: 'Access detailed information about a specific Vercel project'
      },
      async (uri, { projectId }) => {
        const project = await vercelRequest<any>(`/v9/projects/${projectId}`);

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
     * Deployment Resource
     * Access detailed information about a specific deployment
     */
    server.registerResource(
      'deployment',
      new ResourceTemplate('vercel://deployment/{deploymentId}', { list: undefined }),
      {
        title: 'Vercel Deployment',
        description: 'Access detailed information about a specific deployment'
      },
      async (uri, { deploymentId }) => {
        const deployment = await vercelRequest<any>(`/v13/deployments/${deploymentId}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(deployment, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Domain Resource
     * Access information about a specific domain
     */
    server.registerResource(
      'domain',
      new ResourceTemplate('vercel://domain/{domain}', { list: undefined }),
      {
        title: 'Vercel Domain',
        description: 'Access information about a specific domain'
      },
      async (uri, { domain }) => {
        const domainInfo = await vercelRequest<any>(`/v5/domains/${domain}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(domainInfo, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Team Resource
     * Access team information and settings
     */
    server.registerResource(
      'team',
      new ResourceTemplate('vercel://team/{teamId}', { list: undefined }),
      {
        title: 'Vercel Team',
        description: 'Access team information and settings'
      },
      async (uri, { teamId }) => {
        const team = await vercelRequest<any>(`/v2/teams/${teamId}`);

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(team, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Environment Variable Resource
     * Access specific environment variable details
     */
    server.registerResource(
      'env-variable',
      new ResourceTemplate('vercel://project/{projectId}/env/{envId}', { list: undefined }),
      {
        title: 'Environment Variable',
        description: 'Access specific environment variable details'
      },
      async (uri, { projectId, envId }) => {
        const envVars = await vercelRequest<any>(`/v9/projects/${projectId}/env`);
        const envVar = envVars.envs?.find((env: any) => env.id === envId);

        if (!envVar) {
          throw new Error(`Environment variable ${envId} not found`);
        }

        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(envVar, null, 2)
            }
          ]
        };
      }
    );

    // ==================== PROJECT MANAGEMENT TOOLS ====================

    /**
     * List all Vercel projects
     */
    server.registerTool(
      'list_projects',
      {
        title: 'List Projects',
        description: 'List all Vercel projects for the authenticated user/team',
        inputSchema: {
          teamId: z.string().optional().describe('Team ID to filter projects'),
          limit: z.number().optional().describe('Maximum number of projects to return'),
          search: z.string().optional().describe('Search query to filter projects')
        }
      },
      async ({ teamId, limit, search }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);
        if (limit) params.append('limit', limit.toString());
        if (search) params.append('search', search);

        const endpoint = `/v9/projects${params.toString() ? '?' + params.toString() : ''}`;
        const response = await vercelRequest<any>(endpoint);

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
     * Create a new Vercel project
     */
    server.registerTool(
      'create_project',
      {
        title: 'Create Project',
        description: 'Create a new Vercel project',
        inputSchema: {
          name: z.string().describe('Project name'),
          framework: z
            .string()
            .optional()
            .describe('Framework preset (e.g., nextjs, vite, remix)'),
          gitRepository: z
            .object({
              type: z.string().describe('Repository type (github, gitlab, bitbucket)'),
              repo: z.string().describe('Repository path (e.g., owner/repo)')
            })
            .optional()
            .describe('Git repository configuration'),
          teamId: z.string().optional().describe('Team ID to create project under'),
          environmentVariables: z
            .array(
              z.object({
                key: z.string(),
                value: z.string(),
                target: z.array(z.enum(['production', 'preview', 'development'])).optional()
              })
            )
            .optional()
            .describe('Environment variables to add')
        }
      },
      async ({ name, framework, gitRepository, teamId, environmentVariables }) => {
        const body: any = { name };
        if (framework) body.framework = framework;
        if (gitRepository) body.gitRepository = gitRepository;
        if (environmentVariables) body.environmentVariables = environmentVariables;

        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v9/projects${params.toString() ? '?' + params.toString() : ''}`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'POST',
          body: JSON.stringify(body)
        });

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
     * Update project settings
     */
    server.registerTool(
      'update_project',
      {
        title: 'Update Project',
        description: 'Update project settings',
        inputSchema: {
          projectId: z.string().describe('Project ID to update'),
          name: z.string().optional().describe('New project name'),
          framework: z.string().optional().describe('Framework preset'),
          buildCommand: z.string().optional().describe('Build command override'),
          outputDirectory: z.string().optional().describe('Output directory override'),
          installCommand: z.string().optional().describe('Install command override'),
          devCommand: z.string().optional().describe('Development command override'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, teamId, ...updates }) => {
        const body: any = {};
        if (updates.name) body.name = updates.name;
        if (updates.framework) body.framework = updates.framework;
        if (updates.buildCommand !== undefined) body.buildCommand = updates.buildCommand;
        if (updates.outputDirectory !== undefined)
          body.outputDirectory = updates.outputDirectory;
        if (updates.installCommand !== undefined) body.installCommand = updates.installCommand;
        if (updates.devCommand !== undefined) body.devCommand = updates.devCommand;

        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v9/projects/${projectId}${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'PATCH',
          body: JSON.stringify(body)
        });

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
     * Delete a Vercel project
     */
    server.registerTool(
      'delete_project',
      {
        title: 'Delete Project',
        description: 'Delete a Vercel project',
        inputSchema: {
          projectId: z.string().describe('Project ID to delete'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v9/projects/${projectId}${
          params.toString() ? '?' + params.toString() : ''
        }`;
        await vercelRequest<any>(endpoint, {
          method: 'DELETE'
        });

        return {
          content: [
            {
              type: 'text',
              text: `Project ${projectId} successfully deleted`
            }
          ]
        };
      }
    );

    // ==================== DEPLOYMENT MANAGEMENT TOOLS ====================

    /**
     * List deployments
     */
    server.registerTool(
      'list_deployments',
      {
        title: 'List Deployments',
        description: 'List deployments for a project or all deployments',
        inputSchema: {
          projectId: z.string().optional().describe('Filter by project ID'),
          teamId: z.string().optional().describe('Team ID'),
          limit: z.number().optional().describe('Maximum number of deployments to return'),
          state: z
            .enum(['BUILDING', 'ERROR', 'INITIALIZING', 'QUEUED', 'READY', 'CANCELED'])
            .optional()
            .describe('Filter by deployment state')
        }
      },
      async ({ projectId, teamId, limit, state }) => {
        const params = new URLSearchParams();
        if (projectId) params.append('projectId', projectId);
        if (teamId) params.append('teamId', teamId);
        if (limit) params.append('limit', limit.toString());
        if (state) params.append('state', state);

        const endpoint = `/v6/deployments${params.toString() ? '?' + params.toString() : ''}`;
        const response = await vercelRequest<any>(endpoint);

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
     * Create a new deployment
     */
    server.registerTool(
      'create_deployment',
      {
        title: 'Create Deployment',
        description: 'Create a new deployment',
        inputSchema: {
          projectId: z.string().describe('Project ID to deploy'),
          target: z
            .enum(['production', 'preview'])
            .optional()
            .describe('Deployment target environment'),
          gitSource: z
            .object({
              type: z.string().describe('Git provider type'),
              ref: z.string().describe('Git branch or commit SHA'),
              repoId: z.string().describe('Repository ID')
            })
            .optional()
            .describe('Git source configuration'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, target, gitSource, teamId }) => {
        const body: any = { name: projectId };
        if (target) body.target = target;
        if (gitSource) body.gitSource = gitSource;

        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v13/deployments${params.toString() ? '?' + params.toString() : ''}`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'POST',
          body: JSON.stringify(body)
        });

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
     * Cancel a running deployment
     */
    server.registerTool(
      'cancel_deployment',
      {
        title: 'Cancel Deployment',
        description: 'Cancel a running deployment',
        inputSchema: {
          deploymentId: z.string().describe('Deployment ID to cancel'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ deploymentId, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v12/deployments/${deploymentId}/cancel${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'PATCH'
        });

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
     * Get deployment logs
     */
    server.registerTool(
      'get_deployment_logs',
      {
        title: 'Get Deployment Logs',
        description: 'Retrieve build and runtime logs for a deployment',
        inputSchema: {
          deploymentId: z.string().describe('Deployment ID'),
          teamId: z.string().optional().describe('Team ID'),
          limit: z.number().optional().describe('Maximum number of log entries to return')
        }
      },
      async ({ deploymentId, teamId, limit }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);
        if (limit) params.append('limit', limit.toString());

        const endpoint = `/v2/deployments/${deploymentId}/events${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint);

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

    // ==================== DOMAIN MANAGEMENT TOOLS ====================

    /**
     * List all domains
     */
    server.registerTool(
      'list_domains',
      {
        title: 'List Domains',
        description: 'List all domains for the authenticated user/team',
        inputSchema: {
          projectId: z.string().optional().describe('Filter by project ID'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        let endpoint: string;
        if (projectId) {
          endpoint = `/v9/projects/${projectId}/domains${
            params.toString() ? '?' + params.toString() : ''
          }`;
        } else {
          endpoint = `/v5/domains${params.toString() ? '?' + params.toString() : ''}`;
        }

        const response = await vercelRequest<any>(endpoint);

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
     * Add a domain to a project
     */
    server.registerTool(
      'add_domain',
      {
        title: 'Add Domain',
        description: 'Add a domain to a project',
        inputSchema: {
          projectId: z.string().describe('Project ID'),
          domain: z.string().describe('Domain name to add'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, domain, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v10/projects/${projectId}/domains${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'POST',
          body: JSON.stringify({ name: domain })
        });

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
     * Remove a domain
     */
    server.registerTool(
      'remove_domain',
      {
        title: 'Remove Domain',
        description: 'Remove a domain from a project',
        inputSchema: {
          domain: z.string().describe('Domain name to remove'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ domain, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v6/domains/${domain}${
          params.toString() ? '?' + params.toString() : ''
        }`;
        await vercelRequest<any>(endpoint, {
          method: 'DELETE'
        });

        return {
          content: [
            {
              type: 'text',
              text: `Domain ${domain} successfully removed`
            }
          ]
        };
      }
    );

    /**
     * Verify domain ownership
     */
    server.registerTool(
      'verify_domain',
      {
        title: 'Verify Domain',
        description: 'Verify domain ownership',
        inputSchema: {
          domain: z.string().describe('Domain name to verify'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ domain, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v6/domains/${domain}/verify${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'POST'
        });

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

    // ==================== ENVIRONMENT VARIABLE TOOLS ====================

    /**
     * List environment variables for a project
     */
    server.registerTool(
      'list_env_variables',
      {
        title: 'List Environment Variables',
        description: 'List environment variables for a project',
        inputSchema: {
          projectId: z.string().describe('Project ID'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v9/projects/${projectId}/env${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint);

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
     * Create a new environment variable
     */
    server.registerTool(
      'create_env_variable',
      {
        title: 'Create Environment Variable',
        description: 'Create a new environment variable',
        inputSchema: {
          projectId: z.string().describe('Project ID'),
          key: z.string().describe('Environment variable key'),
          value: z.string().describe('Environment variable value'),
          target: z
            .array(z.enum(['production', 'preview', 'development']))
            .describe('Target environments'),
          gitBranch: z.string().optional().describe('Git branch to scope the variable to'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, key, value, target, gitBranch, teamId }) => {
        const body: any = {
          key,
          value,
          target,
          type: 'encrypted'
        };
        if (gitBranch) body.gitBranch = gitBranch;

        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v10/projects/${projectId}/env${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'POST',
          body: JSON.stringify(body)
        });

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
     * Update an existing environment variable
     */
    server.registerTool(
      'update_env_variable',
      {
        title: 'Update Environment Variable',
        description: 'Update an existing environment variable',
        inputSchema: {
          projectId: z.string().describe('Project ID'),
          envId: z.string().describe('Environment variable ID'),
          value: z.string().optional().describe('New value'),
          target: z
            .array(z.enum(['production', 'preview', 'development']))
            .optional()
            .describe('Target environments'),
          gitBranch: z.string().optional().describe('Git branch to scope the variable to'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, envId, value, target, gitBranch, teamId }) => {
        const body: any = {};
        if (value !== undefined) body.value = value;
        if (target !== undefined) body.target = target;
        if (gitBranch !== undefined) body.gitBranch = gitBranch;

        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v9/projects/${projectId}/env/${envId}${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'PATCH',
          body: JSON.stringify(body)
        });

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
     * Delete an environment variable
     */
    server.registerTool(
      'delete_env_variable',
      {
        title: 'Delete Environment Variable',
        description: 'Delete an environment variable',
        inputSchema: {
          projectId: z.string().describe('Project ID'),
          envId: z.string().describe('Environment variable ID'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ projectId, envId, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v9/projects/${projectId}/env/${envId}${
          params.toString() ? '?' + params.toString() : ''
        }`;
        await vercelRequest<any>(endpoint, {
          method: 'DELETE'
        });

        return {
          content: [
            {
              type: 'text',
              text: `Environment variable ${envId} successfully deleted`
            }
          ]
        };
      }
    );

    // ==================== TEAM MANAGEMENT TOOLS ====================

    /**
     * List all teams
     */
    server.registerTool(
      'list_teams',
      {
        title: 'List Teams',
        description: 'List all teams the authenticated user belongs to',
        inputSchema: {}
      },
      async () => {
        const response = await vercelRequest<any>('/v2/teams');

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
     * Get team members
     */
    server.registerTool(
      'get_team_members',
      {
        title: 'Get Team Members',
        description: 'List members of a specific team',
        inputSchema: {
          teamId: z.string().describe('Team ID')
        }
      },
      async ({ teamId }) => {
        const response = await vercelRequest<any>(`/v2/teams/${teamId}/members`);

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

    // ==================== ALIAS MANAGEMENT TOOLS ====================

    /**
     * List aliases
     */
    server.registerTool(
      'list_aliases',
      {
        title: 'List Aliases',
        description: 'List all aliases for a deployment or project',
        inputSchema: {
          deploymentId: z.string().optional().describe('Filter by deployment ID'),
          projectId: z.string().optional().describe('Filter by project ID'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ deploymentId, projectId, teamId }) => {
        const params = new URLSearchParams();
        if (deploymentId) params.append('deploymentId', deploymentId);
        if (projectId) params.append('projectId', projectId);
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v4/aliases${params.toString() ? '?' + params.toString() : ''}`;
        const response = await vercelRequest<any>(endpoint);

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
     * Assign an alias to a deployment
     */
    server.registerTool(
      'assign_alias',
      {
        title: 'Assign Alias',
        description: 'Assign an alias to a deployment',
        inputSchema: {
          deploymentId: z.string().describe('Deployment ID'),
          alias: z.string().describe('Alias to assign'),
          teamId: z.string().optional().describe('Team ID')
        }
      },
      async ({ deploymentId, alias, teamId }) => {
        const params = new URLSearchParams();
        if (teamId) params.append('teamId', teamId);

        const endpoint = `/v2/deployments/${deploymentId}/aliases${
          params.toString() ? '?' + params.toString() : ''
        }`;
        const response = await vercelRequest<any>(endpoint, {
          method: 'POST',
          body: JSON.stringify({ alias })
        });

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
  }
);
