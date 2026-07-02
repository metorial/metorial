import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, fetchKnowledgeBase } from '../lib/client';
import { spec } from '../spec';

export let getKnowledgeBaseTool = SlateTool.create(spec, {
  name: 'Get Knowledge Base',
  key: 'get_knowledge_base',
  description: `Fetch details of a specific knowledge base by its ID or name. Returns the full knowledge base configuration and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      knowledgeBaseId: z
        .string()
        .optional()
        .describe('Knowledge base ID. Required if name is not provided.'),
      name: z
        .string()
        .optional()
        .describe('Knowledge base name. Required if knowledgeBaseId is not provided.'),
      username: z.string().optional().describe('Username for name-based lookups'),
      orgName: z.string().optional().describe('Organization name for name-based lookups')
    })
  )
  .output(
    z.object({
      knowledgeBase: z.record(z.string(), z.unknown()).describe('Full knowledge base object')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    let result = await fetchKnowledgeBase(api, {
      knowledgeBaseId: ctx.input.knowledgeBaseId,
      name: ctx.input.name,
      username: ctx.input.username,
      orgName: ctx.input.orgName
    });

    return {
      output: {
        knowledgeBase: result.object ?? result
      },
      message: `Retrieved knowledge base details.`
    };
  })
  .build();
