import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { circleCiValidationError } from '../lib/validation';
import { spec } from '../spec';

export let manageProjectEnvVars = SlateTool.create(spec, {
  name: 'Manage Project Environment Variables',
  key: 'manage_project_env_vars',
  description: `List, create, or delete environment variables for a CircleCI project. Environment variable values are masked when listed — only the last 4 characters are visible.`,
  instructions: [
    'Use action "list" to see all env vars (values are masked).',
    'Use action "create" to add a new variable (name and value required).',
    'Use action "delete" to remove a variable by name.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      projectSlug: z
        .string()
        .describe('Project slug in the format vcs-slug/org-name/repo-name'),
      action: z.enum(['list', 'create', 'delete']).describe('Action to perform'),
      name: z
        .string()
        .optional()
        .describe('Name of the environment variable (required for create/delete)'),
      value: z
        .string()
        .optional()
        .describe('Value of the environment variable (required for create)'),
      pageToken: z.string().optional().describe('Pagination token for the list action')
    })
  )
  .output(
    z.object({
      envVars: z
        .array(
          z.object({
            name: z.string(),
            value: z.string().describe('Masked value showing only last 4 characters')
          })
        )
        .optional(),
      created: z
        .object({
          name: z.string(),
          value: z.string()
        })
        .optional(),
      deleted: z.boolean().optional(),
      nextPageToken: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.pageToken && ctx.input.action !== 'list') {
      throw circleCiValidationError('pageToken is only supported for the list action.');
    }
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'list') {
      let result = await client.listProjectEnvVars(ctx.input.projectSlug, ctx.input.pageToken);
      let envVars = (result.items || []).map((e: any) => ({
        name: e.name,
        value: e.value
      }));
      return {
        output: { envVars, nextPageToken: result.next_page_token },
        message: `Found **${envVars.length}** environment variable(s) for project \`${ctx.input.projectSlug}\`.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name || ctx.input.value === undefined) {
        throw circleCiValidationError(
          'Both name and value are required to create an environment variable.'
        );
      }
      let result = await client.createProjectEnvVar(
        ctx.input.projectSlug,
        ctx.input.name,
        ctx.input.value
      );
      return {
        output: { created: { name: result.name, value: result.value } },
        message: `Environment variable **${result.name}** created for project \`${ctx.input.projectSlug}\`.`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.name) {
        throw circleCiValidationError('Name is required to delete an environment variable.');
      }
      await client.deleteProjectEnvVar(ctx.input.projectSlug, ctx.input.name);
      return {
        output: { deleted: true },
        message: `Environment variable **${ctx.input.name}** deleted from project \`${ctx.input.projectSlug}\`.`
      };
    }

    throw circleCiValidationError(`Unknown action: ${ctx.input.action}`);
  })
  .build();
