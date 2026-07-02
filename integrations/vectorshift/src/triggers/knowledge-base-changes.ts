import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { createApiClient, fetchKnowledgeBase, listKnowledgeBases } from '../lib/client';
import { spec } from '../spec';

export let knowledgeBaseChangesTrigger = SlateTrigger.create(spec, {
  name: 'Knowledge Base Changes',
  key: 'knowledge_base_changes',
  description: 'Detects when knowledge bases are added or removed from the account.'
})
  .input(
    z.object({
      changeType: z
        .enum(['added', 'removed'])
        .describe('Whether the knowledge base was added or removed'),
      knowledgeBaseId: z.string().describe('ID of the affected knowledge base')
    })
  )
  .output(
    z.object({
      knowledgeBaseId: z.string().describe('ID of the affected knowledge base'),
      name: z
        .string()
        .optional()
        .describe('Name of the knowledge base (available for added knowledge bases)'),
      description: z.string().optional().describe('Description of the knowledge base')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let api = createApiClient(ctx.auth.token);
      let result = await listKnowledgeBases(api, { includeShared: false, verbose: false });
      let currentIds: string[] = result.object_ids ?? [];
      let previousIds: string[] = (ctx.state?.knownIds as string[]) ?? [];

      let addedIds = currentIds.filter(id => !previousIds.includes(id));
      let removedIds = previousIds.filter(id => !currentIds.includes(id));

      let inputs = [
        ...addedIds.map(id => ({ changeType: 'added' as const, knowledgeBaseId: id })),
        ...removedIds.map(id => ({ changeType: 'removed' as const, knowledgeBaseId: id }))
      ];

      return {
        inputs,
        updatedState: {
          knownIds: currentIds
        }
      };
    },

    handleEvent: async ctx => {
      let name: string | undefined;
      let description: string | undefined;

      if (ctx.input.changeType === 'added') {
        try {
          let api = createApiClient(ctx.auth.token);
          let result = await fetchKnowledgeBase(api, {
            knowledgeBaseId: ctx.input.knowledgeBaseId
          });
          let obj = result.object ?? result;
          name = obj.name;
          description = obj.description;
        } catch {
          // Knowledge base details may not be available
        }
      }

      return {
        type: `knowledge_base.${ctx.input.changeType}`,
        id: `knowledge_base.${ctx.input.changeType}.${ctx.input.knowledgeBaseId}`,
        output: {
          knowledgeBaseId: ctx.input.knowledgeBaseId,
          name,
          description
        }
      };
    }
  })
  .build();
