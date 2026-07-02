import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let deleteMemory = SlateTool.create(spec, {
  name: 'Delete Memory',
  key: 'delete_memory',
  description: `Delete a memory (RAG knowledge base) and all its documents from Langbase. This action is permanent and cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      memoryName: z.string().describe('Name of the memory to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);
    let result = await client.deleteMemory(ctx.input.memoryName);

    return {
      output: {
        success: result.success ?? true
      },
      message: `Deleted memory **${ctx.input.memoryName}**.`
    };
  })
  .build();
