import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlagsClient } from '../lib/client';
import { spec } from '../spec';

export let listEnvironments = SlateTool.create(spec, {
  name: 'List Environments',
  key: 'list_environments',
  description:
    'Discover Feature Experimentation environment keys and SDK configuration for a project before retrieving or toggling its flag rulesets. Call manage_project with action=list to discover project IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      projectId: z
        .number()
        .describe('Project ID. Call manage_project with action=list to discover projects.'),
      perPage: z.number().optional().describe('Maximum environments returned per page'),
      pageToken: z
        .string()
        .optional()
        .describe('Pagination token from a previous response URL'),
      archived: z.boolean().optional().describe('Filter environments by archived status')
    })
  )
  .output(
    z.object({
      environments: z.array(z.any()).describe('Environments, including their names and keys'),
      pagination: z
        .any()
        .optional()
        .describe('Provider pagination information and navigation URLs')
    })
  )
  .handleInvocation(async ctx => {
    let result = await new FlagsClient(ctx.auth.token).listEnvironments(ctx.input.projectId, {
      per_page: ctx.input.perPage,
      page_token: ctx.input.pageToken,
      archived: ctx.input.archived
    });
    let environments = Array.isArray(result) ? result : result.items;
    return {
      output: {
        environments,
        pagination: Array.isArray(result) ? undefined : { ...result, items: undefined }
      },
      message: `Listed ${environments.length} environments.`
    };
  })
  .build();
