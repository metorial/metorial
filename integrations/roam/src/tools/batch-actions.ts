import { SlateTool } from 'slates';
import { z } from 'zod';
import { RoamClient, type WriteAction } from '../lib/client';
import { fail } from '../lib/validation';
import { spec } from '../spec';

let createBlockActionSchema = z.object({
  action: z.literal('create-block'),
  parentUid: z.string().describe('UID of the parent page or block'),
  order: z
    .union([z.number().nonnegative().max(Number.MAX_SAFE_INTEGER), z.enum(['first', 'last'])])
    .describe('Position among siblings'),
  content: z.string().describe('Block text content'),
  blockUid: z.string().optional().describe('Optional custom UID for the new block')
});

let updateBlockActionSchema = z.object({
  action: z.literal('update-block'),
  blockUid: z.string().describe('UID of the block to update'),
  content: z.string().optional().describe('New text content'),
  open: z.boolean().optional().describe('Expanded or collapsed state'),
  heading: z.number().min(0).max(3).optional().describe('Heading level (0, 1, 2, or 3)')
});

let moveBlockActionSchema = z.object({
  action: z.literal('move-block'),
  blockUid: z.string().describe('UID of the block to move'),
  parentUid: z.string().describe('UID of the new parent'),
  order: z
    .union([z.number().nonnegative().max(Number.MAX_SAFE_INTEGER), z.enum(['first', 'last'])])
    .describe('Position among siblings')
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

let updatePageActionSchema = z.object({
  action: z.literal('update-page'),
  pageUid: z.string().describe('UID of the page to rename'),
  title: z.string().describe('New page title')
});

let batchActionSchema = z.discriminatedUnion('action', [
  createBlockActionSchema,
  updateBlockActionSchema,
  moveBlockActionSchema,
  deleteBlockActionSchema,
  createPageActionSchema,
  updatePageActionSchema,
  deletePageActionSchema
]);

export let batchActions = SlateTool.create(spec, {
  name: 'Batch Actions',
  key: 'batch_actions',
  description: `Execute multiple write operations in a single batch request. Supports creating, updating, moving, and deleting blocks and pages.

Actions are executed in the provided order. For creating nested blocks, assign a custom UID to a parent block and reference it in child blocks within the same batch.`,
  instructions: [
    'Actions execute in order. You can reference a custom blockUid from an earlier create-block action in a later action.',
    'A failed or lost batch may leave earlier actions changed. Read the original target UIDs and reconcile before retrying; never blindly resend the whole batch. The local limit is 100 actions.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      actions: z
        .array(batchActionSchema)
        .min(1)
        .max(100)
        .describe('Array of actions to execute in order')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the batch was executed successfully'),
      targetUids: z
        .array(z.string())
        .describe('Exact target UIDs, including assigned create UIDs, for recovery'),
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
              ...(a.blockUid !== undefined ? { uid: a.blockUid } : {})
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
              ...(a.pageUid !== undefined ? { uid: a.pageUid } : {})
            }
          };
        case 'update-page':
          return { action: 'update-page', page: { uid: a.pageUid, title: a.title } };
        case 'delete-page':
          return {
            action: 'delete-page',
            page: { uid: a.pageUid }
          };
        default:
          return fail('Unsupported Roam batch action.');
      }
    });

    let result = await client.batchWrite(writeActions);

    return {
      output: {
        success: result.success,
        actionCount: writeActions.length,
        targetUids: result.targetUids
      },
      message: 'The batch was accepted and final target readbacks were checked.'
    };
  })
  .build();
