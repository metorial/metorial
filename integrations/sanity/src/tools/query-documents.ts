import { SlateTool } from 'slates';
import { z } from 'zod';
import { SanityClient } from '../lib/client';
import { spec } from '../spec';

export let queryDocuments = SlateTool.create(spec, {
  name: 'Query Documents',
  key: 'query_documents',
  description: `Query documents from Sanity's Content Lake using GROQ (Graph-Relational Object Queries). Supports filtering, projections, ordering, slicing, and references across documents within a dataset. Use parameters to safely pass dynamic values into queries.`,
  instructions: [
    'Use GROQ syntax for queries. Example: `*[_type == "article"]{ title, slug, _createdAt }` to get all articles with selected fields.',
    'Use the params field to pass dynamic values into queries safely. Reference them with `$` prefix in the query, e.g., `*[_type == $type]` with params `{ "type": "article" }`.',
    'Use the perspective option to query drafts ("previewDrafts") or only published content ("published").'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      query: z
        .string()
        .describe('GROQ query string. Example: *[_type == "post"]{ title, body, _id }'),
      params: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Query parameters for safe value substitution. Keys should match $-prefixed variables in the query.'
        ),
      perspective: z
        .enum(['published', 'previewDrafts', 'raw'])
        .optional()
        .describe(
          'Query perspective. "published" returns only published documents, "previewDrafts" overlays drafts on published, "raw" returns all documents as-is.'
        ),
      useCdn: z
        .boolean()
        .optional()
        .describe(
          'Use the CDN-cached endpoint for faster reads. Only works for published content.'
        )
    })
  )
  .output(
    z.object({
      result: z
        .any()
        .describe('Query result data. Shape depends on the GROQ query and projection used.'),
      ms: z.number().optional().describe('Query execution time in milliseconds.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SanityClient({
      token: ctx.auth.token,
      projectId: ctx.config.projectId,
      dataset: ctx.config.dataset,
      apiVersion: ctx.config.apiVersion
    });

    let response = await client.query(ctx.input.query, ctx.input.params, {
      perspective: ctx.input.perspective,
      useCdn: ctx.input.useCdn
    });

    let resultCount = Array.isArray(response.result) ? response.result.length : 1;

    return {
      output: {
        result: response.result,
        ms: response.ms
      },
      message: `Query executed in ${response.ms}ms. Returned ${Array.isArray(response.result) ? `${resultCount} result(s)` : 'a single value'}.`
    };
  })
  .build();
