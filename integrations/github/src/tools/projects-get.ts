import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubProjectsApi } from '../lib/github-projects';
import { spec } from '../spec';

let projectsGetMethodSchema = z.enum([
  'get_project',
  'get_project_field',
  'get_project_item',
  'get_project_status_update'
]);

export let projectsGet = SlateTool.create(spec, {
  name: 'Get GitHub Projects Resource',
  key: 'projects_get',
  description:
    'Get details about specific GitHub Projects resources.\nUse this tool to get details about individual projects, project fields, and project items by their unique IDs.',
  tags: { readOnly: true }
})
  .scopes(anyOf('read:project'))
  .input(
    z.object({
      method: projectsGetMethodSchema.describe('The method to execute'),
      owner_type: z
        .enum(['user', 'org'])
        .optional()
        .describe(
          'Owner type (user or org). If not provided, will be automatically detected.'
        ),
      owner: z
        .string()
        .optional()
        .describe('The owner (user or organization login). The name is not case sensitive.'),
      project_number: z.number().optional().describe("The project's number."),
      field_id: z
        .number()
        .optional()
        .describe("The field's ID. Required for 'get_project_field' method."),
      item_id: z
        .number()
        .optional()
        .describe("The item's ID. Required for 'get_project_item' method."),
      fields: z
        .array(z.string())
        .optional()
        .describe(
          "Specific list of field IDs to include in the response when getting a project item (e.g. [\"102589\", \"985201\", \"169875\"]). If neither 'fields' nor 'field_names' is provided, only the title field is included. Mutually exclusive with 'field_names' — provide one, not both. Only used for 'get_project_item' method."
        ),
      field_names: z
        .array(z.string())
        .optional()
        .describe(
          "Specific list of field names to include in the response when getting a project item (e.g. [\"Status\", \"Priority\"]). Resolved server-side to field IDs — pass this instead of 'fields' when you only know the human-readable names. Mutually exclusive with 'fields' — provide one, not both. Only used for 'get_project_item' method."
        ),
      status_update_id: z
        .string()
        .optional()
        .describe(
          "The node ID of the project status update. Required for 'get_project_status_update' method."
        )
    })
  )
  .output(
    z.object({
      method: projectsGetMethodSchema,
      owner: z.string().nullable(),
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

    let api = new GitHubProjectsApi(ctx.auth);
    if (input.method === 'get_project_status_update') {
      if (!input.status_update_id) {
        throw createApiServiceError(
          "status_update_id is required for 'get_project_status_update'.",
          { reason: 'github_projects_status_update_id_required' }
        );
      }
      let result = await api.getProjectStatusUpdate(input.status_update_id);
      return {
        output: {
          method: input.method,
          owner: null,
          ownerType: null,
          result
        },
        message: 'Retrieved the GitHub project status update.'
      };
    }

    if (
      !input.owner ||
      !Number.isSafeInteger(input.project_number) ||
      (input.project_number ?? 0) < 1
    ) {
      throw createApiServiceError(
        `${input.method} requires owner and a positive project_number.`,
        { reason: 'github_projects_owner_and_number_required' }
      );
    }

    let projectNumber = input.project_number as number;
    let result: Record<string, any>;
    let ownerType: 'user' | 'org';
    switch (input.method) {
      case 'get_project': {
        let response = await api.getProject(input.owner, input.owner_type, projectNumber);
        ownerType = response.ownerType;
        result = response.value;
        break;
      }
      case 'get_project_field': {
        if (!Number.isSafeInteger(input.field_id)) {
          throw createApiServiceError("field_id is required for 'get_project_field'.", {
            reason: 'github_projects_field_id_required'
          });
        }
        let response = await api.getProjectField(
          input.owner,
          input.owner_type,
          projectNumber,
          input.field_id as number
        );
        ownerType = response.ownerType;
        result = response.value;
        break;
      }
      default: {
        if (!Number.isSafeInteger(input.item_id)) {
          throw createApiServiceError("item_id is required for 'get_project_item'.", {
            reason: 'github_projects_item_id_required'
          });
        }
        let response = await api.getProjectItem(
          input.owner,
          input.owner_type,
          projectNumber,
          input.item_id as number,
          {
            fields: input.fields,
            fieldNames: input.field_names
          }
        );
        ownerType = response.ownerType;
        result = response.value;
      }
    }

    return {
      output: {
        method: input.method,
        owner: input.owner,
        ownerType,
        result
      },
      message: `Retrieved **${input.method.replaceAll('_', ' ')}** from **${input.owner}**.`
    };
  })
  .build();
