import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, type TagImage } from '../lib/client';
import { spec } from '../spec';

export let getTag = SlateTool.create(spec, {
  name: 'Get Image Tag',
  key: 'get_tag',
  description: `Get details for a specific Docker Hub repository tag, including digest, size, last update time, and platform image metadata.`,
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
      tagName: z.string().describe('Name of the tag to read.')
    })
  )
  .output(
    z.object({
      tagName: z.string().describe('Name of the tag.'),
      fullSize: z.number().describe('Full compressed size in bytes.'),
      lastUpdated: z.string().describe('ISO timestamp of the last update.'),
      lastUpdaterUsername: z.string().describe('Username of the last updater.'),
      digest: z.string().describe('Image digest.'),
      status: z.string().describe('Tag status.'),
      images: z
        .array(
          z.object({
            architecture: z.string().describe('CPU architecture.'),
            os: z.string().describe('Operating system.'),
            size: z.number().describe('Compressed size in bytes.'),
            digest: z.string().describe('Image digest for this platform.'),
            status: z.string().describe('Image status.')
          })
        )
        .describe('Platform-specific images for multi-arch tags.')
    })
  )
  .handleInvocation(async ctx => {
    let ns = ctx.input.namespace || ctx.config.namespace || ctx.auth.username;

    let client = new Client(ctx.auth);
    let tag = await client.getTag(ns, ctx.input.repositoryName, ctx.input.tagName);

    return {
      output: {
        tagName: tag.name,
        fullSize: tag.full_size,
        lastUpdated: tag.last_updated,
        lastUpdaterUsername: tag.last_updater_username || '',
        digest: tag.digest || '',
        status: tag.tag_status || '',
        images: (tag.images || []).map((img: TagImage) => ({
          architecture: img.architecture,
          os: img.os,
          size: img.size,
          digest: img.digest,
          status: img.status || ''
        }))
      },
      message: `Retrieved tag **${ctx.input.tagName}** from **${ns}/${ctx.input.repositoryName}**.`
    };
  })
  .build();
