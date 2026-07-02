import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, listKnowledgeBases } from '../lib/client';
import { spec } from '../spec';

export let listKnowledgeBasesTool = SlateTool.create(spec, {
  name: 'List Knowledge Bases',
  key: 'list_knowledge_bases',
  description: `List all knowledge bases in the VectorShift account. Optionally include shared knowledge bases and retrieve full details.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeShared: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include knowledge bases shared with you'),
      verbose: z
        .boolean()
        .optional()
        .default(false)
        .describe('Include full knowledge base objects in the response')
    })
  )
  .output(
    z.object({
      knowledgeBaseIds: z.array(z.string()).describe('List of knowledge base IDs'),
      knowledgeBases: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('Full knowledge base objects (when verbose is true)')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await listKnowledgeBases(api, {
      includeShared: ctx.input.includeShared,
      verbose: ctx.input.verbose
    });

    return {
      output: {
        knowledgeBaseIds: result.object_ids ?? [],
        knowledgeBases: result.objects
      },
      message: `Found **${(result.object_ids ?? []).length}** knowledge bases.`
    };
  })
  .build();
