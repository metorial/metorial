import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient, type WriteAction } from '../lib/client';
import { spec } from '../spec';

let createBlockActionSchema = z.object({
  action: z.literal('create-block'),
  parentUid: z.string().describe('UID of the parent page or block'),
  order: z.union([z.number(), z.enum(['first', 'last'])]).describe('Position among siblings'),
  content: z.string().describe('Block text content'),
  blockUid: z.string().optional().describe('Optional custom UID for the new block')
});

let updateBlockActionSchema = z.object({
  action: z.literal('update-block'),
  blockUid: z.string().describe('UID of the block to update'),
  content: z.string().optional().describe('New text content'),
  open: z.boolean().optional().describe('Expanded or collapsed state'),
  heading: z.number().optional().describe('Heading level (1, 2, or 3)')
});

let moveBlockActionSchema = z.object({
  action: z.literal('move-block'),
  blockUid: z.string().describe('UID of the block to move'),
  parentUid: z.string().describe('UID of the new parent'),
  order: z.union([z.number(), z.enum(['first', 'last'])]).describe('Position among siblings')
});

let deleteBlockActionSchema = z.object({
  action: z.literal('delete-block'),
  blockUid: z.string().describe('UID of the block to delete')
});

let createPageActionSchema = z.object({
  action: z.literal('create-page'),
  title: z.string().describe('Title of the new page'),
  pageUid: z.string().optional().describe('Optional custom UID for the page')
});

let deletePageActionSchema = z.object({
  action: z.literal('delete-page'),
  pageUid: z.string().describe('UID of the page to delete')
});

let batchActionSchema = z.discriminatedUnion('action', [
  createBlockActionSchema,
  updateBlockActionSchema,
  moveBlockActionSchema,
  deleteBlockActionSchema,
  createPageActionSchema,
  deletePageActionSchema
]);

export let batchActions = SlateTool.create(spec, {
  name: 'Batch Actions',
  key: 'batch_actions',
  description: `Execute multiple write operations in a single batch request. Supports creating, updating, moving, and deleting blocks and pages.

Actions are executed in the provided order. For creating nested blocks, assign a custom UID to a parent block and reference it in child blocks within the same batch.`,
  instructions: [
    'Actions execute in order. You can reference a custom blockUid from an earlier create-block action in a later action.',
    'The batch is non-transactional: if one action fails, others may still succeed.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      actions: z.array(batchActionSchema).describe('Array of actions to execute in order')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the batch was executed successfully'),
      actionCount: z.number().describe('Number of actions in the batch')
    })
  )
  .handleInvocation(async ctx => {
    let client = new RoamClient({
      graphName: ctx.config.graphName,
      token: ctx.auth.token
    });

    let writeActions: WriteAction[] = ctx.input.actions.map((a): WriteAction => {
      switch (a.action) {
        case 'create-block':
          return {
            action: 'create-block',
            location: { 'parent-uid': a.parentUid, order: a.order },
            block: {
              string: a.content,
              ...(a.blockUid ? { uid: a.blockUid } : {})
            }
          };
        case 'update-block':
          return {
            action: 'update-block',
            block: {
              uid: a.blockUid,
              ...(a.content !== undefined ? { string: a.content } : {}),
              ...(a.open !== undefined ? { open: a.open } : {}),
              ...(a.heading !== undefined ? { heading: a.heading } : {})
            }
          };
        case 'move-block':
          return {
            action: 'move-block',
            location: { 'parent-uid': a.parentUid, order: a.order },
            block: { uid: a.blockUid }
          };
        case 'delete-block':
          return {
            action: 'delete-block',
            block: { uid: a.blockUid }
          };
        case 'create-page':
          return {
            action: 'create-page',
            page: {
              title: a.title,
              ...(a.pageUid ? { uid: a.pageUid } : {})
            }
          };
        case 'delete-page':
          return {
            action: 'delete-page',
            page: { uid: a.pageUid }
          };
        default:
          throw new Error(
            `Unsupported Roam batch action: ${(a as { action: string }).action}`
          );
      }
    });

    let result = await client.batchWrite(writeActions);

    return {
      output: {
        success: result.success,
        actionCount: writeActions.length
      },
      message: `Batch of **${writeActions.length}** action(s) executed in graph **${ctx.config.graphName}**.`
    };
  })
  .build();
