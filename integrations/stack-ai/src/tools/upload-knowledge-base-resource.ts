import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/client';
import { uploadFields } from '../lib/schemas';
import { spec } from '../spec';

export const uploadKnowledgeBaseResource = SlateTool.create(spec, {
  key: 'upload_knowledge_base_resource',
  name: 'Upload Knowledge Base Resource',
  description:
    'Upload a file directly into an existing Stack AI knowledge base and start indexing. Returns the provider resource ID. Use list_knowledge_base_resources to read back the resource; acceptance does not mean indexing has finished.',
  tags: { readOnly: false, destructive: false }
})
  .input(
    z.object({
      knowledgeBaseId: z
        .string()
        .min(1)
        .describe('Knowledge base ID from list_knowledge_bases or the Stack AI dashboard'),
      ...uploadFields
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      knowledgeBaseId: z.string(),
      fileName: z.string(),
      status: z.literal('accepted')
    })
  )
  .handleInvocation(async ctx => {
    const result = await createClient(ctx).uploadKnowledgeBaseResource(
      ctx.input.knowledgeBaseId,
      ctx.input.fileName,
      ctx.input.content,
      ctx.input.encoding ?? 'text',
      ctx.input.mimeType
    );
    return {
      output: {
        resourceId: result.resource_id,
        knowledgeBaseId: ctx.input.knowledgeBaseId,
        fileName: ctx.input.fileName,
        status: 'accepted' as const
      },
      message: result.message
    };
  })
  .build();
