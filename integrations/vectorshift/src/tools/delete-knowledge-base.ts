import { SlateTool } from 'slates';
import { z } from 'zod';
import { createApiClient, deleteKnowledgeBase } from '../lib/client';
import { spec } from '../spec';

export let deleteKnowledgeBaseTool = SlateTool.create(spec, {
  name: 'Delete Knowledge Base',
  key: 'delete_knowledge_base',
  description: `Permanently delete a knowledge base and all its indexed documents from VectorShift. This action cannot be undone.`,
  constraints: ['This action is irreversible.'],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      knowledgeBaseId: z.string().describe('ID of the knowledge base to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let api = createApiClient(ctx.auth.token);
    await deleteKnowledgeBase(api, ctx.input.knowledgeBaseId);

    return {
      output: { success: true },
      message: `Knowledge base \`${ctx.input.knowledgeBaseId}\` deleted successfully.`
    };
  })
  .build();
