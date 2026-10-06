import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { resourceId, selection } from '../lib/schemas';
import { spec } from '../spec';

export let getEntry = SlateTool.create(spec, {
  name: 'Get Entry',
  key: 'get_entry',
  description: `Retrieve a single entry by ID. Returns the full entry fields, metadata, and version information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      ...selection,
      api: z
        .enum(['management', 'delivery', 'preview'])
        .optional()
        .describe(
          'API for legacy token-only connections. Must match the credential type; reconnect if unknown.'
        ),
      entryId: resourceId.describe('The ID of the entry to retrieve.')
    })
  )
  .output(
    z.object({
      entryId: resourceId,
      contentTypeId: resourceId.optional(),
      fields: z.record(z.string(), z.any()),
      version: z.number().optional(),
      createdAt: z.string().optional(),
      updatedAt: z.string().optional(),
      publishedAt: z.string().optional(),
      publishedVersion: z.number().optional(),
      archivedAt: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx.config, ctx.auth, ctx.input);
    let entry = await client.getEntry(ctx.input.entryId);

    return {
      output: {
        entryId: entry.sys?.id,
        contentTypeId: entry.sys?.contentType?.sys?.id,
        fields: entry.fields || {},
        version: entry.sys?.version,
        createdAt: entry.sys?.createdAt,
        updatedAt: entry.sys?.updatedAt,
        publishedAt: entry.sys?.publishedAt,
        publishedVersion: entry.sys?.publishedVersion,
        archivedAt: entry.sys?.archivedAt
      },
      message: `Retrieved entry **${entry.sys?.id}** (content type: ${entry.sys?.contentType?.sys?.id || 'unknown'}).`
    };
  })
  .build();
