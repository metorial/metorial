import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubActionsClient } from '../lib/client';
import type { Variable } from '../lib/types';
import { validateInput } from '../lib/validation';
import { spec } from '../spec';

let variableSchema = z.object({
  variableName: z.string().describe('Variable name'),
  variableValue: z.string().describe('Variable value'),
  createdAt: z.string().optional().describe('Creation timestamp'),
  updatedAt: z.string().optional().describe('Last update timestamp'),
  visibility: z
    .string()
    .optional()
    .describe('Visibility for org variables (all, private, selected)')
});

export let manageVariables = SlateTool.create(spec, {
  name: 'Manage Variables',
  key: 'manage_variables',
  description: `List, get, create, update, or delete Actions configuration variables at the repository, organization, or environment level. Unlike secrets, variable values are visible in API responses.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      owner: z
        .string()
        .optional()
        .describe('Repository owner, required for repo and environment scopes'),
      repo: z
        .string()
        .optional()
        .describe('Repository name, required for repo and environment scopes'),
      org: z.string().optional().describe('Organization name, required for org scope'),
      scope: z.enum(['repo', 'org', 'environment']).describe('Variable scope level'),
      environmentName: z
        .string()
        .optional()
        .describe('Environment name, required for environment scope'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      variableName: z
        .string()
        .optional()
        .describe('Variable name, required for get/create/update/delete'),
      variableValue: z
        .string()
        .optional()
        .describe('Variable value, required for create/update'),
      visibility: z
        .enum(['all', 'private', 'selected'])
        .optional()
        .describe('Visibility for org variables'),
      selectedRepositoryIds: z
        .array(z.number())
        .optional()
        .describe('Repository IDs for "selected" visibility org variables'),
      perPage: z.number().optional().describe('Results per page'),
      page: z.number().optional().describe('Page number')
    })
  )
  .output(
    z.object({
      variables: z.array(variableSchema).optional().describe('List of variables'),
      totalCount: z.number().optional().describe('Total number of variables'),
      variable: variableSchema.optional().describe('Single variable'),
      created: z.boolean().optional().describe('Whether the variable was created'),
      updated: z.boolean().optional().describe('Whether the variable was updated'),
      deleted: z.boolean().optional().describe('Whether the variable was deleted')
    })
  )
  .handleInvocation(async ctx => {
    validateInput(ctx.input);
    if (ctx.input.visibility === 'selected' && ctx.input.selectedRepositoryIds === undefined)
      throw createApiServiceError(
        'selectedRepositoryIds is required for selected visibility.'
      );
    let client = new GitHubActionsClient(ctx.auth.token);
    let {
      scope,
      action,
      owner,
      repo,
      org,
      environmentName,
      variableName,
      variableValue,
      perPage,
      page
    } = ctx.input;

    if (action === 'list') {
      let data: { total_count: number; variables: Variable[] };
      if (scope === 'org') {
        if (!org) throw createApiServiceError('org is required for org scope.');
        data = await client.listOrgVariables(org, { perPage, page });
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw createApiServiceError('owner, repo, and environmentName are required.');
        data = await client.listEnvironmentVariables(owner, repo, environmentName, {
          perPage,
          page
        });
      } else {
        if (!owner || !repo) throw createApiServiceError('owner and repo are required.');
        data = await client.listRepoVariables(owner, repo, { perPage, page });
      }
      let variables = (data.variables ?? []).map(v => ({
        variableName: v.name,
        variableValue: v.value,
        createdAt: v.created_at,
        updatedAt: v.updated_at,
        visibility: v.visibility
      }));
      return {
        output: { variables, totalCount: data.total_count },
        message: `Found **${data.total_count}** ${scope}-level variables.`
      };
    }

    if (action === 'get') {
      if (!variableName) throw createApiServiceError('variableName is required.');
      let variable: Variable;
      if (scope === 'org') {
        if (!org) throw createApiServiceError('org is required.');
        variable = await client.getOrgVariable(org, variableName);
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw createApiServiceError(
            'owner, repo, and environmentName are required for environment scope.'
          );
        variable = await client.getEnvironmentVariable(
          owner,
          repo,
          environmentName,
          variableName
        );
      } else {
        if (!owner || !repo) throw createApiServiceError('owner and repo are required.');
        variable = await client.getRepoVariable(owner, repo, variableName);
      }
      return {
        output: {
          variable: {
            variableName: variable.name,
            variableValue: variable.value,
            createdAt: variable.created_at,
            updatedAt: variable.updated_at,
            visibility: variable.visibility
          }
        },
        message: `Variable **${variableName}** = \`${variable.value}\`.`
      };
    }

    if (action === 'create') {
      if (!variableName || variableValue === undefined)
        throw createApiServiceError('variableName and variableValue are required.');
      if (scope === 'org') {
        if (!org) throw createApiServiceError('org is required.');
        await client.createOrgVariable(
          org,
          variableName,
          variableValue,
          ctx.input.visibility ?? 'private',
          ctx.input.selectedRepositoryIds
        );
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw createApiServiceError('owner, repo, and environmentName are required.');
        await client.createEnvironmentVariable(
          owner,
          repo,
          environmentName,
          variableName,
          variableValue
        );
      } else {
        if (!owner || !repo) throw createApiServiceError('owner and repo are required.');
        await client.createRepoVariable(owner, repo, variableName, variableValue);
      }
      return {
        output: { created: true },
        message: `Created ${scope}-level variable **${variableName}**.`
      };
    }

    if (action === 'update') {
      if (scope !== 'org' && variableValue === undefined)
        throw createApiServiceError(
          'variableValue is required for repository or environment variable updates.'
        );
      if (
        variableValue === undefined &&
        ctx.input.visibility === undefined &&
        ctx.input.selectedRepositoryIds === undefined
      )
        throw createApiServiceError(
          'Provide variableValue, visibility, or selectedRepositoryIds for update.'
        );
      if (!variableName) throw createApiServiceError('variableName is required.');
      if (scope === 'org') {
        if (!org) throw createApiServiceError('org is required.');
        await client.updateOrgVariable(org, variableName, {
          name: variableName,
          value: variableValue,
          visibility: ctx.input.visibility,
          selectedRepositoryIds: ctx.input.selectedRepositoryIds
        });
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw createApiServiceError('owner, repo, and environmentName are required.');
        await client.updateEnvironmentVariable(owner, repo, environmentName, variableName, {
          value: variableValue
        });
      } else {
        if (!owner || !repo) throw createApiServiceError('owner and repo are required.');
        await client.updateRepoVariable(owner, repo, variableName, { value: variableValue });
      }
      return {
        output: { updated: true },
        message: `Updated ${scope}-level variable **${variableName}**.`
      };
    }

    if (action === 'delete') {
      if (!variableName) throw createApiServiceError('variableName is required.');
      if (scope === 'org') {
        if (!org) throw createApiServiceError('org is required.');
        await client.deleteOrgVariable(org, variableName);
      } else if (scope === 'environment') {
        if (!owner || !repo || !environmentName)
          throw createApiServiceError('owner, repo, and environmentName are required.');
        await client.deleteEnvironmentVariable(owner, repo, environmentName, variableName);
      } else {
        if (!owner || !repo) throw createApiServiceError('owner and repo are required.');
        await client.deleteRepoVariable(owner, repo, variableName);
      }
      return {
        output: { deleted: true },
        message: `Deleted ${scope}-level variable **${variableName}**.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
