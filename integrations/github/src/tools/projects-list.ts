import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubProjectsApi } from '../lib/github-projects';
import { spec } from '../spec';

let projectsListMethodSchema = z.enum([
  'list_projects',
  'list_project_fields',
  'list_project_items',
  'list_project_status_updates'
]);

export let projectsList = SlateTool.create(spec, {
  name: 'List GitHub Projects Resources',
  key: 'projects_list',
  description:
    'Tools for listing GitHub Projects resources.\nUse this tool to list projects for a user or organization, or list project fields and items for a specific project.',
  tags: { readOnly: true }
})
  .scopes(anyOf('read:project'))
  .input(
    z.object({
      method: projectsListMethodSchema.describe('The action to perform'),
      owner_type: z
        .enum(['user', 'org'])
        .optional()
        .describe('Owner type (user or org). If not provided, will automatically try both.'),
      owner: z
        .string()
        .describe('The owner (user or organization login). The name is not case sensitive.'),
      project_number: z
        .number()
        .optional()
        .describe(
          "The project's number. Required for 'list_project_fields', 'list_project_items', and 'list_project_status_updates' methods."
        ),
      query: z
        .string()
        .optional()
        .describe(
          'Filter/query string. For list_projects: filter by title text and state (e.g. "roadmap is:open"). For list_project_items: advanced filtering using GitHub\'s project filtering syntax.'
        ),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          "Field IDs to include when listing project items (e.g. [\"102589\", \"985201\"]). CRITICAL: Always provide to get field values. Without this (and without 'field_names'), only titles returned. Mutually exclusive with 'field_names' — provide one, not both. Only used for 'list_project_items' method."
        ),
      field_names: z
        .array(z.string())
        .optional()
        .describe(
          "Field names to include when listing project items (e.g. [\"Status\", \"Priority\"]). Resolved server-side to field IDs — pass this instead of 'fields' when you only know the human-readable names. Names that fail to resolve return a structured error. Mutually exclusive with 'fields' — provide one, not both. Only used for 'list_project_items' method."
        ),
      per_page: z.number().optional().describe('Results per page (max 50)'),
      after: z
        .string()
        .optional()
        .describe('Forward pagination cursor from previous pageInfo.nextCursor.'),
      before: z
        .string()
        .optional()
        .describe('Backward pagination cursor from previous pageInfo.prevCursor (rare).')
    })
  )
  .output(
    z.object({
      method: projectsListMethodSchema,
      owner: z.string(),
      ownerType: z.enum(['user', 'org']).nullable(),
      result: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    if (input.fields && input.field_names) {
      throw createApiServiceError("Provide either 'fields' or 'field_names', not both.", {
        reason: 'github_projects_conflicting_fields'
      });
    }
    if (
      input.method !== 'list_projects' &&
      (!Number.isSafeInteger(input.project_number) || (input.project_number ?? 0) < 1)
    ) {
      throw createApiServiceError(`project_number is required for '${input.method}'.`, {
        reason: 'github_projects_project_number_required'
      });
    }

    let api = new GitHubProjectsApi(ctx.auth);
    let result: Record<string, any>;
    let ownerType = input.owner_type ?? null;
    switch (input.method) {
      case 'list_projects':
        result = await api.listProjects(input.owner, input.owner_type, {
          query: input.query,
          perPage: input.per_page,
          after: input.after,
          before: input.before
        });
        break;
      case 'list_project_fields': {
        let response = await api.listProjectFields(
          input.owner,
          input.owner_type,
          input.project_number as number,
          {
            perPage: input.per_page,
            after: input.after,
            before: input.before
          }
        );
        ownerType = response.ownerType;
        result = {
          fields: response.value.data,
          pageInfo: response.value.pageInfo
        };
        break;
      }
      case 'list_project_items': {
        let response = await api.listProjectItems(
          input.owner,
          input.owner_type,
          input.project_number as number,
          {
            query: input.query,
            fields: input.fields,
            fieldNames: input.field_names,
            perPage: input.per_page,
            after: input.after,
            before: input.before
          }
        );
        ownerType = response.ownerType;
        result = response.value;
        break;
      }
      default: {
        let response = await api.listProjectStatusUpdates(
          input.owner,
          input.owner_type,
          input.project_number as number,
          {
            perPage: input.per_page,
            after: input.after,
            before: input.before
          }
        );
        ownerType = response.ownerType;
        result = response.value;
      }
    }

    let count =
      (Array.isArray(result.projects) && result.projects.length) ||
      (Array.isArray(result.fields) && result.fields.length) ||
      (Array.isArray(result.items) && result.items.length) ||
      (Array.isArray(result.statusUpdates) && result.statusUpdates.length) ||
      0;
    return {
      output: {
        method: input.method,
        owner: input.owner,
        ownerType,
        result
      },
      message: `Found **${count}** GitHub Projects resources for **${input.owner}**.`
    };
  })
  .build();
