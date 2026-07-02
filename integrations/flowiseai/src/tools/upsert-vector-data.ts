import { SlateTool } from 'slates';
import { z } from 'zod';
import { FlowiseClient } from '../lib/client';
import { spec } from '../spec';

export let upsertVectorData = SlateTool.create(spec, {
  name: 'Upsert Vector Data',
  key: 'upsert_vector_data',
  description: `Upsert data into a vector store associated with a chatflow, enabling dynamic knowledge base updates. Specify the chatflow ID and optionally target a specific vector store node and override configuration.`,
  tags: {
    readOnly: false,
    destructive: false
  }
})
  .input(
    z.object({
      chatflowId: z.string().describe('ID of the chatflow whose vector store to upsert into'),
      stopNodeId: z
        .string()
        .optional()
        .describe('Target a specific vector store node within the chatflow'),
      overrideConfig: z
        .record(z.string(), z.any())
        .optional()
        .describe('Configuration overrides for the upsert operation')
    })
  )
  .output(
    z.object({
      numAdded: z.number().optional().describe('Number of documents added'),
      numDeleted: z.number().optional().describe('Number of documents deleted'),
      numUpdated: z.number().optional().describe('Number of documents updated'),
      numSkipped: z.number().optional().describe('Number of documents skipped'),
      addedDocs: z.array(z.any()).optional().describe('Details of added documents')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FlowiseClient({
      baseUrl: ctx.config.baseUrl,
      token: ctx.auth.token
    });

    let result = await client.vectorUpsert(ctx.input.chatflowId, {
      stopNodeId: ctx.input.stopNodeId,
      overrideConfig: ctx.input.overrideConfig
    });

    return {
      output: {
        numAdded: result.numAdded,
        numDeleted: result.numDeleted,
        numUpdated: result.numUpdated,
        numSkipped: result.numSkipped,
        addedDocs: result.addedDocs
      },
      message: `Vector upsert completed for chatflow \`${ctx.input.chatflowId}\`: ${result.numAdded ?? 0} added, ${result.numUpdated ?? 0} updated, ${result.numDeleted ?? 0} deleted, ${result.numSkipped ?? 0} skipped.`
    };
  })
  .build();
