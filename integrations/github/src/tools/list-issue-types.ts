import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import { createGitHubReadClient, githubReadApiError } from './read-shared';

export let listIssueTypes = SlateTool.create(spec, {
  name: 'List Issue Types',
  key: 'list_issue_types',
  description:
    'List issue types available to a GitHub repository or directly from its owner organization.',
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
          'Repository name. When omitted, returns issue types defined by the organization.'
        )
    })
  )
  .output(
    z.object({
      owner: z.string().describe('Account owner'),
      repo: z.string().nullable().describe('Repository name, or null for organization scope'),
      scope: z.enum(['repository', 'organization']).describe('Source of the issue types'),
      issueTypes: z.array(
        z.object({
          issueTypeId: z.number().describe('Numeric issue type ID'),
          nodeId: z.string().describe('GraphQL node ID'),
          name: z.string().describe('Issue type name'),
          description: z.string().nullable().describe('Issue type description'),
          color: z.string().nullable().optional().describe('Issue type color'),
          isEnabled: z
            .boolean()
            .optional()
            .describe('Whether the issue type is enabled at this scope'),
          createdAt: z.string().optional().describe('Creation timestamp'),
          updatedAt: z.string().optional().describe('Last update timestamp')
        })
      ),
      totalCount: z.number().describe('Number of issue types returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = createGitHubReadClient(ctx.auth);

    try {
      let issueTypes = await client.listIssueTypes(ctx.input.owner, ctx.input.repo);
      let mapped = issueTypes.map((issueType: any) => ({
        issueTypeId: issueType.id,
        nodeId: issueType.node_id,
        name: issueType.name,
        description: issueType.description ?? null,
        color: issueType.color ?? null,
        isEnabled: issueType.is_enabled,
        createdAt: issueType.created_at,
        updatedAt: issueType.updated_at
      }));

      return {
        output: {
          owner: ctx.input.owner,
          repo: ctx.input.repo ?? null,
          scope: ctx.input.repo ? ('repository' as const) : ('organization' as const),
          issueTypes: mapped,
          totalCount: mapped.length
        },
        message: `Found **${mapped.length}** issue types for **${
          ctx.input.repo ? `${ctx.input.owner}/${ctx.input.repo}` : ctx.input.owner
        }**.`
      };
    } catch (error) {
      throw githubReadApiError(error, 'list issue types');
    }
  })
  .build();
