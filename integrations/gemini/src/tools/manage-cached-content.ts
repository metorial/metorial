import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let cachedContentSchema = z.object({
  cachedContentName: z
    .string()
    .describe('Resource name of the cached content (e.g. "cachedContents/abc123")'),
  model: z.string().optional().describe('Model the cached content is associated with'),
  displayName: z.string().optional().describe('Display name of the cached content'),
  createTime: z.string().optional().describe('When the cached content was created'),
  updateTime: z.string().optional().describe('When the cached content was last updated'),
  expireTime: z.string().optional().describe('When the cached content expires'),
  usageMetadata: z
    .object({
      totalTokenCount: z.number().optional()
    })
    .optional()
    .describe('Token usage metadata for the cached content')
});

let mapCachedContent = (cachedContent: any) => ({
  cachedContentName: cachedContent.name,
  model: cachedContent.model,
  displayName: cachedContent.displayName,
  createTime: cachedContent.createTime,
  updateTime: cachedContent.updateTime,
  expireTime: cachedContent.expireTime,
  usageMetadata: cachedContent.usageMetadata
});

export let createCachedContent = SlateTool.create(spec, {
  name: 'Create Cached Content',
  key: 'create_cached_content',
  description: `Create cached content to save and reuse precomputed input tokens. Caching is useful when repeatedly prompting with the same large context (e.g., a long document or system instructions). Cached content can be referenced in subsequent generation requests for cost and latency savings.`,
  instructions: [
    'The model must be specified and must support context caching.',
    'Set TTL as a duration string (e.g. "3600s" for 1 hour). Default is 1 hour if not specified.',
    'Cached content must contain at least 32,768 tokens for most models.'
  ],
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      model: z
        .string()
        .describe('Model to cache content for (e.g. "gemini-1.5-pro", "gemini-2.0-flash")'),
      contents: z
        .array(
          z.object({
            role: z.enum(['user', 'model']).optional().describe('Role for the content'),
            parts: z
              .array(
                z.union([
                  z.object({ text: z.string() }),
                  z.object({
                    fileData: z.object({
                      mimeType: z.string().optional(),
                      fileUri: z.string()
                    })
                  })
                ])
              )
              .describe('Content parts')
          })
        )
        .describe('Content to cache'),
      systemInstruction: z
        .string()
        .optional()
        .describe('System instruction text to include in the cache'),
      ttl: z.string().optional().describe('Time-to-live duration (e.g. "3600s" for 1 hour)'),
      expireTime: z
        .string()
        .optional()
        .describe('Absolute expiration timestamp in RFC 3339 format'),
      displayName: z
        .string()
        .optional()
        .describe('Human-readable display name for the cached content')
    })
  )
  .output(cachedContentSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let systemInstruction = ctx.input.systemInstruction
      ? { parts: [{ text: ctx.input.systemInstruction }] }
      : undefined;

    let result = await client.createCachedContent({
      model: ctx.input.model,
      contents: ctx.input.contents,
      systemInstruction,
      ttl: ctx.input.ttl,
      expireTime: ctx.input.expireTime,
      displayName: ctx.input.displayName
    });

    return {
      output: mapCachedContent(result),
      message: `Created cached content **${result.name}**${result.displayName ? ` ("${result.displayName}")` : ''} for model **${result.model}**. Expires at ${result.expireTime ?? 'default TTL'}.`
    };
  })
  .build();

export let listCachedContents = SlateTool.create(spec, {
  name: 'List Cached Contents',
  key: 'list_cached_contents',
  description: `List all cached content entries. Returns cached content metadata including model association, creation time, and expiration.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      pageSize: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Maximum number of cached contents to return'),
      pageToken: z.string().optional().describe('Token for fetching the next page')
    })
  )
  .output(
    z.object({
      cachedContents: z.array(cachedContentSchema).describe('Cached content entries'),
      nextPageToken: z.string().optional().describe('Token for the next page')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.listCachedContents({
      pageSize: ctx.input.pageSize,
      pageToken: ctx.input.pageToken
    });

    let cachedContents = (result.cachedContents ?? []).map(mapCachedContent);

    return {
      output: {
        cachedContents,
        nextPageToken: result.nextPageToken
      },
      message: `Found **${cachedContents.length}** cached content entry(ies).`
    };
  })
  .build();

export let getCachedContent = SlateTool.create(spec, {
  name: 'Get Cached Content',
  key: 'get_cached_content',
  description: `Get metadata for a cached content entry. The API returns cache metadata such as model, display name, token usage, and expiration, but not the original cached content body.`,
  tags: {
    readOnly: true,
    destructive: false
  }
})
  .input(
    z.object({
      cachedContentName: z
        .string()
        .describe('Resource name of the cached content (e.g. "cachedContents/abc123")')
    })
  )
  .output(cachedContentSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.getCachedContent(ctx.input.cachedContentName);

    return {
      output: mapCachedContent(result),
      message: `Retrieved cached content **${result.name}**. Expires at ${result.expireTime ?? 'unknown'}.`
    };
  })
  .build();

export let updateCachedContent = SlateTool.create(spec, {
  name: 'Update Cached Content',
  key: 'update_cached_content',
  description: `Update the TTL or expiration time of existing cached content. Use this to extend or shorten the lifetime of a cache entry.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      cachedContentName: z
        .string()
        .describe('Resource name of the cached content (e.g. "cachedContents/abc123")'),
      ttl: z
        .string()
        .optional()
        .describe('New time-to-live duration (e.g. "7200s" for 2 hours)'),
      expireTime: z
        .string()
        .optional()
        .describe('New absolute expiration timestamp in RFC 3339 format')
    })
  )
  .output(cachedContentSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    let result = await client.updateCachedContent(ctx.input.cachedContentName, {
      ttl: ctx.input.ttl,
      expireTime: ctx.input.expireTime
    });

    return {
      output: mapCachedContent(result),
      message: `Updated cached content **${result.name}**. New expiration: ${result.expireTime ?? 'unknown'}.`
    };
  })
  .build();

export let deleteCachedContent = SlateTool.create(spec, {
  name: 'Delete Cached Content',
  key: 'delete_cached_content',
  description: `Delete a cached content entry. The cached content will no longer be available for use in generation requests.`,
  tags: {
    readOnly: false,
    destructive: true
  }
})
  .input(
    z.object({
      cachedContentName: z
        .string()
        .describe(
          'Resource name of the cached content to delete (e.g. "cachedContents/abc123")'
        )
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the cached content was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);

    await client.deleteCachedContent(ctx.input.cachedContentName);

    return {
      output: { deleted: true },
      message: `Deleted cached content **${ctx.input.cachedContentName}**.`
    };
  })
  .build();
