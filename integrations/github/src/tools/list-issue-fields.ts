import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createGitHubReadClient, githubReadApiError } from './read-shared';

export let listIssueFields = SlateTool.create(spec, {
  name: 'List Issue Fields',
  key: 'list_issue_fields',
  description:
    'List issue field definitions for a GitHub repository or organization, including valid options for single-select fields.',
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      owner: z.string().describe('The account owner of the repository or organization'),
      repo: z
        .string()
        .optional()
        .describe(
          'Repository name. When omitted, returns issue fields defined by the organization.'
        )
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Account owner'),
      repo: z.string().nullable().describe('Repository name, or null for organization scope'),
      scope: z.enum(['repository', 'organization']).describe('Source of the issue fields'),
      fields: z.array(
        z.object({
          fieldId: z.string().describe('GraphQL node ID for the field'),
          fullDatabaseId: z.number().optional().describe('Numeric database ID for the field'),
          name: z.string().describe('Field name'),
          description: z.string().nullable().describe('Field description'),
          dataType: z
            .string()
            .describe('Field data type, such as text, number, date, or single_select'),
          visibility: z.string().describe('Field visibility'),
          options: z.array(
            z.object({
              optionId: z.string().describe('GraphQL node ID for the option'),
              name: z.string().describe('Option name'),
              description: z.string().nullable().describe('Option description'),
              color: z.string().describe('Option color'),
              priority: z.number().nullable().describe('Option priority')
            })
          )
        })
      ),
      totalCount: z.number().describe('Number of issue fields returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGitHubReadClient(ctx.auth);

    try {
      let fields = await client.listIssueFields(ctx.input.owner, ctx.input.repo);
      let mapped = fields.map(field => ({
        fieldId: field.id,
        fullDatabaseId: field.fullDatabaseId,
        name: field.name,
        description: field.description,
        dataType: field.dataType,
        visibility: field.visibility,
        options: field.options.map((option: any) => ({
          optionId: option.id,
          name: option.name,
          description: option.description,
          color: option.color,
          priority: option.priority
        }))
      }));

      return {
        output: {
          owner: ctx.input.owner,
          repo: ctx.input.repo ?? null,
          scope: ctx.input.repo ? ('repository' as const) : ('organization' as const),
          fields: mapped,
          totalCount: mapped.length
        },
        message: `Found **${mapped.length}** issue fields for **${
          ctx.input.repo ? `${ctx.input.owner}/${ctx.input.repo}` : ctx.input.owner
        }**.`
      };
    } catch (error) {
      throw githubReadApiError(error, 'list issue fields');
    }
  })
  .build();
