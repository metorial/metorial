import { anyOf, SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

let treeEntrySchema = z.object({
  path: z.string(),
  type: z.string(),
  size: z.number().optional(),
  mode: z.string(),
  sha: z.string(),
  url: z.string()
});

export let getRepositoryTree = SlateTool.create(spec, {
  name: 'Get Repository Tree',
  key: 'get_repository_tree',
  description:
    'Get the tree structure (files and directories) of a GitHub repository at a specific ref or SHA.',
  tags: { readOnly: true }
})
  .scopes(anyOf('repo', 'public_repo'))
  .input(
    z.object({
      owner: z.string().describe('Repository owner (username or organization)'),
      repo: z.string().describe('Repository name'),
      tree_sha: z
        .string()
        .optional()
        .describe(
          "The SHA1 value or ref (branch or tag) name of the tree. Defaults to the repository's default branch"
        ),
      recursive: z
        .boolean()
        .default(false)
        .optional()
        .describe(
          'Setting this parameter to true returns the objects or subtrees referenced by the tree. Default is false'
        ),
      path_filter: z
        .string()
        .optional()
        .describe(
          "Optional path prefix to filter the tree results (e.g., 'src/' to only show files in the src directory)"
        )
    })
  )
  .output(
    z.object({
      sha: z.string(),
      truncated: z.boolean(),
      tree: z.array(treeEntrySchema),
      tree_sha: z.string(),
      owner: z.string(),
      repo: z.string(),
      recursive: z.boolean(),
      count: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let result = await client.getRepositoryTree(ctx.input.owner, ctx.input.repo, {
      treeSha: ctx.input.tree_sha,
      recursive: ctx.input.recursive,
      pathFilter: ctx.input.path_filter
    });

    return {
      output: result,
      message: `Retrieved **${result.count}** tree entries from **${ctx.input.owner}/${ctx.input.repo}** at \`${result.tree_sha}\`${ctx.input.path_filter ? ` under \`${ctx.input.path_filter}\`` : ''}.`
    };
  })
  .build();
