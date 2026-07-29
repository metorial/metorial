import { SlateTool } from 'slates';
import { z } from 'zod';
import { GitHubClient } from '../lib/client';
import { spec } from '../spec';

export let getTag = SlateTool.create(spec, {
  name: 'Get Tag Details',
  key: 'get_tag',
  description:
    'Get details about a git tag, including whether it is lightweight or annotated and the object it targets.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      owner: z.string().describe('Repository owner'),
      repo: z.string().describe('Repository name'),
      tag: z.string().describe('Tag name')
    })
  )
  .output(
    z.object({
      tag: z.string(),
      ref: z.string(),
      nodeId: z.string().optional(),
      annotated: z.boolean(),
      tagObjectSha: z.string().nullable(),
      targetType: z.string(),
      targetSha: z.string(),
      targetUrl: z.string(),
      message: z.string().nullable(),
      tagger: z
        .object({
          name: z.string().nullable(),
          email: z.string().nullable(),
          date: z.string().nullable()
        })
        .nullable(),
      verification: z.record(z.string(), z.any()).nullable()
    })
  )
  .handleInvocation(async ctx => {
    let client = new GitHubClient(ctx.auth);
    let { reference, tagObject } = await client.getTag(
      ctx.input.owner,
      ctx.input.repo,
      ctx.input.tag
    );
    let target = tagObject?.object ?? reference.object;
    return {
      output: {
        tag: ctx.input.tag,
        ref: reference.ref,
        nodeId: tagObject?.node_id ?? reference.node_id,
        annotated: Boolean(tagObject),
        tagObjectSha: tagObject?.sha ?? null,
        targetType: target.type,
        targetSha: target.sha,
        targetUrl: target.url,
        message: tagObject?.message ?? null,
        tagger: tagObject?.tagger
          ? {
              name: tagObject.tagger.name ?? null,
              email: tagObject.tagger.email ?? null,
              date: tagObject.tagger.date ?? null
            }
          : null,
        verification: tagObject?.verification ?? null
      },
      message: `Retrieved ${tagObject ? 'annotated' : 'lightweight'} tag \`${ctx.input.tag}\` from **${ctx.input.owner}/${ctx.input.repo}**.`
    };
  })
  .build();
