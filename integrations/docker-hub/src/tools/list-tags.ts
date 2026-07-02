import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listTags = SlateTool.create(spec, {
  name: 'List Image Tags',
  key: 'list_tags',
  description: `List tags for a Docker Hub repository. Returns tag details including size, digest, last updated time, and platform information for multi-arch images. Supports pagination.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      namespace: z
        .string()
        .optional()
        .describe(
          'Docker Hub namespace (username or organization). Falls back to configured default namespace.'
        ),
      repositoryName: z.string().describe('Name of the repository.'),
      page: z.number().optional().describe('Page number for pagination (starts at 1).'),
      pageSize: z
        .number()
        .optional()
        .describe('Number of results per page (default 25, max 100).')
    })
  )
  .output(
    z.object({
      totalCount: z.number().describe('Total number of tags in the repository.'),
      tags: z.array(
        z.object({
          tagName: z.string().describe('Name of the tag.'),
          fullSize: z.number().describe('Full compressed size in bytes.'),
          lastUpdated: z.string().describe('ISO timestamp of the last update.'),
          lastUpdaterUsername: z.string().describe('Username of the last updater.'),
          digest: z.string().describe('Image digest.'),
          status: z.string().describe('Tag status (active, stale, etc.).'),
          images: z
            .array(
              z.object({
                architecture: z.string().describe('CPU architecture (amd64, arm64, etc.).'),
                os: z.string().describe('Operating system.'),
                size: z.number().describe('Compressed size in bytes.'),
                digest: z.string().describe('Image layer digest.')
              })
            )
            .describe('Platform-specific images for multi-arch tags.')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client({ token: ctx.auth.token });
    let result = await client.listTags(ns, ctx.input.repositoryName, {
      page: ctx.input.page,
      pageSize: ctx.input.pageSize
    });

    return {
      output: {
        totalCount: result.count,
        tags: result.results.map(t => ({
          tagName: t.name,
          fullSize: t.full_size,
          lastUpdated: t.last_updated,
          lastUpdaterUsername: t.last_updater_username,
          digest: t.digest || '',
          status: t.tag_status || '',
          images: (t.images || []).map(img => ({
            architecture: img.architecture,
            os: img.os,
            size: img.size,
            digest: img.digest
          }))
        }))
      },
      message: `Found **${result.count}** tags in **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();
