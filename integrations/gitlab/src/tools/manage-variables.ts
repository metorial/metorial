import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient, gitLabServiceError } from '../lib/helpers';
import { spec } from '../spec';

let variableSchema = z.object({
  key: z.string(),
  value: z.string(),
  variableType: z.string().optional(),
  isProtected: z.boolean().optional(),
  isMasked: z.boolean().optional(),
  environmentScope: z.string().optional()
});

export let manageVariables = SlateTool.create(spec, {
  name: 'Manage CI/CD Variables',
  key: 'manage_variables',
  description: `List, create, update, or delete CI/CD variables at the project or group level. Variables can be scoped to environments, marked as protected (limited to protected branches/tags), or masked in logs.`,
  instructions: [
    'Use action "list" to get all variables for the scope.',
    'Use action "get" to fetch a single variable by key.',
    'Use action "create" to create a new variable.',
    'Use action "update" to modify an existing variable.',
    'Use action "delete" to remove a variable.'
  ]
})
  .input(
    z.object({
      scope: z.enum(['project', 'group']).default('project').describe('Scope of the variable'),
      scopeId: z
        .string()
        .optional()
        .describe('Project ID or group ID. Falls back to config projectId for project scope.'),
      action: z
        .enum(['list', 'get', 'create', 'update', 'delete'])
        .describe('Action to perform'),
      key: z
        .string()
        .optional()
        .describe('Variable key (required for get, create, update, delete)'),
      value: z
        .string()
        .optional()
        .describe('Variable value (required for create, used in update)'),
      variableType: z.enum(['env_var', 'file']).optional().describe('Variable type'),
      isProtected: z.boolean().optional().describe('Only expose to protected branches/tags'),
      isMasked: z.boolean().optional().describe('Mask the value in job logs'),
      environmentScope: z
        .string()
        .optional()
        .describe('Environment scope (e.g. "production", "*")')
    })
  )
  .output(
    z.object({
      variables: z.array(variableSchema).optional(),
      variable: variableSchema.optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.auth, ctx.config);
    let { scope, action, key, value, variableType, isProtected, isMasked, environmentScope } =
      ctx.input;
    let scopeId =
      ctx.input.scopeId || (scope === 'project' ? ctx.config.projectId : undefined);
    if (!scopeId) {
      throw gitLabServiceError(`${scope} ID is required.`);
    }

    if (action === 'list') {
      let result =
        scope === 'project'
          ? await client.listProjectVariables(scopeId)
          : await client.listGroupVariables(scopeId);
      let variables = (result as any[]).map((v: any) => ({
        key: v.key,
        value: v.value,
        variableType: v.variable_type,
        isProtected: v.protected,
        isMasked: v.masked,
        environmentScope: v.environment_scope
      }));
      return {
        output: { variables },
        message: `Found **${variables.length}** variable(s) in ${scope} **${scopeId}**.`
      };
    }

    if (action === 'get') {
      if (!key) throw gitLabServiceError('key is required for get action');
      let v =
        scope === 'project'
          ? ((await client.getProjectVariable(scopeId, key)) as any)
          : ((await client.getGroupVariable(scopeId, key)) as any);
      return {
        output: {
          variable: {
            key: v.key,
            value: v.value,
            variableType: v.variable_type,
            isProtected: v.protected,
            isMasked: v.masked,
            environmentScope: v.environment_scope
          }
        },
        message: `Retrieved variable **${v.key}** from ${scope} **${scopeId}**.`
      };
    }

    if (action === 'create') {
      if (!key || !value)
        throw gitLabServiceError('key and value are required for create action');
      let data = {
        key,
        value,
        variable_type: variableType,
        protected: isProtected,
        masked: isMasked,
        environment_scope: environmentScope
      };
      let v: any;
      if (scope === 'project') {
        v = await client.createProjectVariable(scopeId, data);
      } else {
        v = await client.createGroupVariable(scopeId, data);
      }
      return {
        output: {
          variable: {
            key: v.key,
            value: v.value,
            variableType: v.variable_type,
            isProtected: v.protected,
            isMasked: v.masked,
            environmentScope: v.environment_scope
          }
        },
        message: `Created variable **${v.key}** in ${scope} **${scopeId}**.`
      };
    }

    if (action === 'update') {
      if (!key) throw gitLabServiceError('key is required for update action');
      let data: any = {};
      if (value !== undefined) data.value = value;
      if (variableType !== undefined) data.variable_type = variableType;
      if (isProtected !== undefined) data.protected = isProtected;
      if (isMasked !== undefined) data.masked = isMasked;
      if (environmentScope !== undefined) data.environment_scope = environmentScope;
      let v: any;
      if (scope === 'project') {
        v = await client.updateProjectVariable(scopeId, key, data);
      } else {
        v = await client.updateGroupVariable(scopeId, key, data);
      }
      return {
        output: {
          variable: {
            key: v.key,
            value: v.value,
            variableType: v.variable_type,
            isProtected: v.protected,
            isMasked: v.masked,
            environmentScope: v.environment_scope
          }
        },
        message: `Updated variable **${v.key}** in ${scope} **${scopeId}**.`
      };
    }

    // delete
    if (!key) throw gitLabServiceError('key is required for delete action');
    if (scope === 'project') {
      await client.deleteProjectVariable(scopeId, key);
    } else {
      await client.deleteGroupVariable(scopeId, key);
    }
    return {
      output: { deleted: true },
      message: `Deleted variable **${key}** from ${scope} **${scopeId}**.`
    };
  })
  .build();
