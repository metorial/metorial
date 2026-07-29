import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubProjectsApi } from '../lib/github-projects';
import { spec } from '../spec';

let projectsWriteMethodSchema = z.enum([
  'add_project_item',
  'create_iteration_field',
  'create_project',
  'create_project_status_update',
  'delete_project_item',
  'update_project_item'
]);

let iterationSchema = z.object({
  title: z.string().describe("Iteration title (e.g. 'Sprint 1')"),
  start_date: z.string().describe('Start date in YYYY-MM-DD format'),
  duration: z.number().describe('Duration in days')
});

let updatedFieldSchema = z
  .unknown()
  .refine(value => typeof value === 'object' && value !== null && !Array.isArray(value), {
    message: 'updated_field must be an object'
  })
  .meta({ type: 'object' });

export let projectsWrite = SlateTool.create(spec, {
  name: 'Manage GitHub Projects',
  key: 'projects_write',
  description:
    'Create and manage GitHub Projects: create projects, add/update/delete items, create status updates, and add iteration fields.',
  tags: { destructive: true }
})
  .scopes(anyOf('project'))
  .input(
    z.object({
      method: projectsWriteMethodSchema.describe('The method to execute'),
      owner_type: z
        .enum(['user', 'org'])
        .optional()
        .describe(
          "Owner type (user or org). Required for 'create_project' method. If not provided for other methods, will be automatically detected."
        ),
      owner: z
        .string()
        .describe(
          'The project owner (user or organization login). The name is not case sensitive.'
        ),
      project_number: z
        .number()
        .optional()
        .describe("The project's number. Required for all methods except 'create_project'."),
      title: z
        .string()
        .optional()
        .describe("The project title. Required for 'create_project' method."),
      item_id: z
        .number()
        .optional()
        .describe(
          "The project item ID. Required for 'delete_project_item'. For 'update_project_item', provide either item_id, or (item_owner + item_repo + issue_number) to resolve the item by issue."
        ),
      item_type: z
        .enum(['issue', 'pull_request'])
        .optional()
        .describe(
          "The item's type, either issue or pull_request. Required for 'add_project_item' method."
        ),
      item_owner: z
        .string()
        .optional()
        .describe(
          "The owner (user or organization) of the repository containing the issue or pull request. Required for 'add_project_item' method. Also accepted by 'update_project_item' when resolving the item by issue number."
        ),
      item_repo: z
        .string()
        .optional()
        .describe(
          "The name of the repository containing the issue or pull request. Required for 'add_project_item' method. Also accepted by 'update_project_item' when resolving the item by issue number."
        ),
      issue_number: z
        .number()
        .optional()
        .describe(
          "The issue number. Required for 'add_project_item' when item_type is 'issue'. Also accepted by 'update_project_item' to resolve the item by issue number (combine with item_owner and item_repo)."
        ),
      pull_request_number: z
        .number()
        .optional()
        .describe(
          "The pull request number (use when item_type is 'pull_request' for 'add_project_item' method). Provide either issue_number or pull_request_number."
        ),
      updated_field: updatedFieldSchema
        .optional()
        .describe(
          'Object describing the field to update and its new value. Required for \'update_project_item\'. Two shapes are accepted: (1) by ID — {"id": 123456, "value": "..."}; (2) by name — {"name": "Status", "value": "In Progress"}. For single-select fields, option-name resolution requires the by-name shape; on the by-ID shape, pass the option ID. Set value to null to clear the field.'
        ),
      body: z
        .string()
        .optional()
        .describe(
          "The body of the status update (markdown). Used for 'create_project_status_update' method."
        ),
      status: z
        .enum(['AT_RISK', 'COMPLETE', 'INACTIVE', 'OFF_TRACK', 'ON_TRACK'])
        .optional()
        .describe(
          "The status of the project. Used for 'create_project_status_update' method."
        ),
      start_date: z
        .string()
        .optional()
        .describe(
          "Start date in YYYY-MM-DD format. Used for 'create_project_status_update' and 'create_iteration_field' methods."
        ),
      target_date: z
        .string()
        .optional()
        .describe(
          "The target date of the status update in YYYY-MM-DD format. Used for 'create_project_status_update' method."
        ),
      field_name: z
        .string()
        .optional()
        .describe(
          "The name of the iteration field (e.g. 'Sprint'). Required for 'create_iteration_field' method."
        ),
      iteration_duration: z
        .number()
        .optional()
        .describe(
          "Duration in days for iterations of the field (e.g. 7 for weekly, 14 for bi-weekly). Required for 'create_iteration_field' method."
        ),
      iterations: z
        .array(iterationSchema)
        .optional()
        .describe(
          "Custom iterations for 'create_iteration_field' method. Only set this when you need iterations with varying durations, breaks between them, or specific titles. Otherwise omit it: GitHub auto-creates three iterations of 'iteration_duration' days starting on 'start_date', which is the right choice for most cases."
        )
    })
  )
  .output(
    z.object({
      method: projectsWriteMethodSchema,
      owner: z.string(),
      ownerType: z.enum(['user', 'org']),
      result: z.record(z.string(), z.any())
    })
  )
  .handleInvocation(async ctx => {
    let input = ctx.input;
    let fail = (message: string, reason: string): never => {
      throw createApiServiceError(message, { reason });
    };
    let requireProjectNumber = () => {
      if (!Number.isSafeInteger(input.project_number) || (input.project_number ?? 0) < 1) {
        fail(
          `project_number is required for '${input.method}'.`,
          'github_project_number_required'
        );
      }
      return input.project_number as number;
    };

    let api = new GitHubProjectsApi(ctx.auth);
    let ownerType: 'user' | 'org';
    let result: Record<string, any>;
    switch (input.method) {
      case 'create_project':
        if (!input.owner_type) {
          fail(
            "owner_type is required for 'create_project'.",
            'github_create_project_owner_type_required'
          );
        }
        if (!input.title?.trim()) {
          fail(
            "title is required for 'create_project'.",
            'github_create_project_title_required'
          );
        }
        ownerType = input.owner_type as 'user' | 'org';
        result = await api.createProject(input.owner, ownerType, input.title as string);
        break;
      case 'add_project_item': {
        let projectNumber = requireProjectNumber();
        if (!input.item_type || !input.item_owner || !input.item_repo) {
          fail(
            'add_project_item requires item_type, item_owner, and item_repo.',
            'github_add_project_item_fields_required'
          );
        }
        let number =
          input.item_type === 'issue' ? input.issue_number : input.pull_request_number;
        if (!Number.isSafeInteger(number)) {
          fail(
            `${input.item_type === 'issue' ? 'issue_number' : 'pull_request_number'} is required when item_type is '${input.item_type}'.`,
            'github_add_project_item_number_required'
          );
        }
        let response = await api.addProjectItem(input.owner, input.owner_type, projectNumber, {
          type: input.item_type as 'issue' | 'pull_request',
          owner: input.item_owner as string,
          repo: input.item_repo as string,
          number: number as number
        });
        ownerType = response.ownerType;
        result = response.value;
        break;
      }
      case 'update_project_item': {
        let projectNumber = requireProjectNumber();
        if (!input.updated_field) {
          fail(
            "updated_field is required for 'update_project_item'.",
            'github_update_project_item_field_required'
          );
        }
        let hasItemId = Number.isSafeInteger(input.item_id);
        let hasIssue =
          Boolean(input.item_owner && input.item_repo) &&
          Number.isSafeInteger(input.issue_number);
        if (hasItemId === hasIssue) {
          fail(
            'update_project_item requires exactly one of item_id or item_owner + item_repo + issue_number.',
            'github_update_project_item_locator_invalid'
          );
        }
        let response = await api.updateProjectItem(
          input.owner,
          input.owner_type,
          projectNumber,
          {
            itemId: hasItemId ? input.item_id : undefined,
            issue: hasIssue
              ? {
                  owner: input.item_owner as string,
                  repo: input.item_repo as string,
                  number: input.issue_number as number
                }
              : undefined,
            updatedField: input.updated_field as {
              id?: number;
              name?: string;
              value?: unknown;
            }
          }
        );
        ownerType = response.ownerType;
        result = response.value;
        break;
      }
      case 'delete_project_item': {
        let projectNumber = requireProjectNumber();
        if (!Number.isSafeInteger(input.item_id)) {
          fail(
            "item_id is required for 'delete_project_item'.",
            'github_delete_project_item_id_required'
          );
        }
        result = await api.deleteProjectItem(
          input.owner,
          input.owner_type,
          projectNumber,
          input.item_id as number
        );
        ownerType = result.owner_type;
        break;
      }
      case 'create_project_status_update': {
        let response = await api.createProjectStatusUpdate(
          input.owner,
          input.owner_type,
          requireProjectNumber(),
          {
            body: input.body,
            status: input.status,
            startDate: input.start_date,
            targetDate: input.target_date
          }
        );
        ownerType = response.ownerType;
        result = response.value;
        break;
      }
      default: {
        let projectNumber = requireProjectNumber();
        if (
          !input.field_name?.trim() ||
          !input.start_date ||
          !Number.isSafeInteger(input.iteration_duration) ||
          (input.iteration_duration ?? 0) < 1
        ) {
          fail(
            'create_iteration_field requires field_name, start_date, and a positive integer iteration_duration.',
            'github_create_iteration_field_fields_required'
          );
        }
        for (let [index, iteration] of (input.iterations ?? []).entries()) {
          if (
            !iteration.title.trim() ||
            !Number.isSafeInteger(iteration.duration) ||
            iteration.duration < 1
          ) {
            fail(
              `iterations[${index}] requires a non-empty title and positive integer duration.`,
              'github_create_iteration_field_iteration_invalid'
            );
          }
        }
        let response = await api.createIterationField(
          input.owner,
          input.owner_type,
          projectNumber,
          {
            name: input.field_name as string,
            startDate: input.start_date as string,
            duration: input.iteration_duration as number,
            iterations: input.iterations
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
      message: `Completed **${input.method.replaceAll('_', ' ')}** for **${input.owner}**.`
    };
  })
  .build();
