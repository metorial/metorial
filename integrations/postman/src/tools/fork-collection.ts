import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let forkCollectionTool = SlateTool.create(spec, {
  name: 'Fork Collection',
  key: 'fork_collection',
  description: `Fork a Postman collection into a specified workspace, or merge a forked collection back into its parent. Also supports listing existing forks of a collection.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['fork', 'merge', 'list_forks']).describe('Operation to perform'),
      collectionId: z.string().describe('Collection ID or UID'),
      label: z.string().optional().describe('Fork label (required for fork)'),
      workspaceId: z
        .string()
        .optional()
        .describe('Destination workspace ID (required for fork)'),
      sourceUid: z.string().optional().describe('Forked collection UID (required for merge)'),
      destinationUid: z
        .string()
        .optional()
        .describe('Parent collection UID (required for merge)'),
      mergeStrategy: z
        .enum(['deleteSource', 'updateSourceWithDestination'])
        .optional()
        .describe('Merge strategy')
    })
  )
  .output(
    z.object({
      collectionId: z.string().optional(),
      name: z.string().optional(),
      uid: z.string().optional(),
      forkLabel: z.string().optional(),
      forks: z.array(z.any()).optional(),
      mergeResult: z.any().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action, collectionId } = ctx.input;

    if (action === 'fork') {
      if (!ctx.input.label) throw new Error('label is required for forking.');
      if (!ctx.input.workspaceId) throw new Error('workspaceId is required for forking.');
      let result = await client.forkCollection(
        collectionId,
        ctx.input.label,
        ctx.input.workspaceId
      );
      return {
        output: {
          collectionId: result.id,
          name: result.name,
          uid: result.uid,
          forkLabel: result.fork?.label
        },
        message: `Forked collection with label **"${ctx.input.label}"**.`
      };
    }

    if (action === 'merge') {
      if (!ctx.input.sourceUid || !ctx.input.destinationUid) {
        throw new Error('sourceUid and destinationUid are required for merge.');
      }
      let result = await client.mergeCollectionFork(
        ctx.input.sourceUid,
        ctx.input.destinationUid,
        ctx.input.mergeStrategy
      );
      return {
        output: { mergeResult: result },
        message: `Merged fork into parent collection.`
      };
    }

    let result = await client.listCollectionForks(collectionId);
    return {
      output: { forks: result.data ?? [] },
      message: `Found ${(result.data ?? []).length} fork(s) for collection **${collectionId}**.`
    };
  })
  .build();
