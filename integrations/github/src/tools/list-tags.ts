import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';
import { paginationInputShape } from './repository-read-contracts';

let tagSchema = z.object({
  name: z.string().describe('Tag name'),
  sha: z.string().describe('Target commit SHA'),
  commitUrl: z.string().describe('Commit API URL'),
  nodeId: z.string().optional().describe('GraphQL node ID'),
  zipballUrl: z.string().optional().describe('Source ZIP URL'),
  tarballUrl: z.string().optional().describe('Source tarball URL')
});

export let listTags = SlateTool.create(spec, {
  name: 'List Tags',
  key: 'list_tags',
  description: 'List git tags in a GitHub repository.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      ...paginationInputShape
    })
  )
  .output(
    z.object({
      tags: z.array(tagSchema),
      page: z.number(),
      perPage: z.number(),
      returnedCount: z.number()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let values = await client.listTags(ctx.input.owner, ctx.input.repo, ctx.input);
    let tags = values.map((tag: any) => ({
      name: tag.name,
      sha: tag.commit?.sha,
      commitUrl: tag.commit?.url,
      nodeId: tag.node_id,
      zipballUrl: tag.zipball_url,
      tarballUrl: tag.tarball_url
    }));
    return {
      output: {
        tags,
        page: ctx.input.page ?? 1,
        perPage: ctx.input.perPage ?? 30,
        returnedCount: tags.length
      },
      message: `Found **${tags.length}** tags in **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
