import { SlateTool } from 'slates';
import { z } from 'zod';
import { ContentApiClient } from '../lib/client';
import { spec } from '../spec';

export let getRepositoryInfo = SlateTool.create(spec, {
  name: 'Get Repository Info',
  key: 'get_repository_info',
  description: `Retrieve metadata about the Prismic repository, including available content types, tags, languages, refs (versions), and bookmarks.
Useful for discovering what content types and tags exist before querying documents.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      refs: z
        .array(
          z.object({
            refId: z.string().describe('Ref identifier'),
            ref: z.string().describe('Ref value to use in queries'),
            label: z.string().describe('Ref label (e.g., "Master")'),
            isMasterRef: z
              .boolean()
              .optional()
              .describe('Whether this is the master (published) ref'),
            scheduledAt: z
              .string()
              .optional()
              .describe('ISO date if this is a scheduled release')
          })
        )
        .describe('Available content refs (versions)'),
      types: z
        .record(z.string(), z.string())
        .describe('Map of type ID to human-readable label'),
      tags: z.array(z.string()).describe('All tags used in the repository'),
      languages: z
        .array(
          z.object({
            languageId: z.string().describe('Language code (e.g., "en-us")'),
            name: z.string().describe('Human-readable language name')
          })
        )
        .describe('Configured languages'),
      bookmarks: z
        .record(z.string(), z.string())
        .describe('Named bookmarks mapping to document IDs')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ContentApiClient({
      repositoryName: ctx.config.repositoryName,
      accessToken: ctx.auth.token
    });

    let metadata = await client.getApiMetadata();

    return {
      output: {
        refs: metadata.refs.map(r => ({
          refId: r.id,
          ref: r.ref,
          label: r.label,
          isMasterRef: r.isMasterRef,
          scheduledAt: r.scheduledAt
        })),
        types: metadata.types,
        tags: metadata.tags,
        languages: metadata.languages.map(l => ({
          languageId: l.id,
          name: l.name
        })),
        bookmarks: metadata.bookmarks
      },
      message: `Repository has **${Object.keys(metadata.types).length}** content types, **${metadata.tags.length}** tags, **${metadata.languages.length}** languages, and **${metadata.refs.length}** refs.`
    };
  })
  .build();
