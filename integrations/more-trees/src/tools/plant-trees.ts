import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let plantTrees = SlateTool.create(spec, {
  name: 'Plant Trees',
  key: 'plant_trees',
  description: `Plant one or more trees for yourself or gift them to others. When planting for yourself, specify a quantity. When gifting, provide a list of recipients with their email or account code, name, and quantity. Optionally specify a project and tree type; defaults are used if omitted. Enable test mode for dry-run validation without persisting changes.`,
  instructions: [
    'Use the **List Projects** tool first to discover available project IDs and tree IDs before planting.',
    'Each recipient must have either an email or account code, plus a name and quantity.'
  ],
  constraints: [
    'Planting consumes credits from your account. Each tree type has a specific credit cost.',
    'When gifting, each recipient must be identified by either email or account code (not both).'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      quantity: z
        .number()
        .int()
        .positive()
        .optional()
        .describe(
          'Number of trees to plant for yourself. Required when not gifting to others.'
        ),
      recipients: z
        .array(
          z.object({
            email: z.string().optional().describe('Email address of the recipient'),
            accountCode: z
              .string()
              .optional()
              .describe('More Trees account code of the recipient'),
            name: z.string().describe('Name of the recipient'),
            quantity: z
              .number()
              .int()
              .positive()
              .describe('Number of trees to gift to this recipient')
          })
        )
        .optional()
        .describe(
          'List of recipients when gifting trees to others. If provided, trees are gifted instead of planted for self.'
        ),
      projectId: z
        .number()
        .int()
        .optional()
        .describe('Project ID to plant in. Uses default project if omitted.'),
      treeId: z
        .number()
        .int()
        .optional()
        .describe('Tree type ID to plant. Uses default tree if omitted.'),
      test: z
        .boolean()
        .optional()
        .describe('Enable test/dry-run mode to validate without persisting changes.')
    })
  )
  .output(
    z.object({
      test: z.boolean().describe('Whether this was a test/dry-run request'),
      plantForOthers: z.boolean().describe('Whether trees were gifted to others'),
      creditsUsed: z.number().describe('Number of credits consumed'),
      creditsRemaining: z.number().describe('Remaining credit balance after planting'),
      projectId: z.number().describe('Project ID used for planting'),
      treeId: z.number().describe('Tree type ID used for planting'),
      recipients: z
        .array(
          z.object({
            accountCode: z.string().describe('Account code of the recipient'),
            accountName: z.string().describe('Account name of the recipient'),
            quantity: z.number().describe('Number of trees gifted to this recipient')
          })
        )
        .optional()
        .describe('Recipient details when gifting trees')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      publicValidationKey: ctx.auth.publicValidationKey
    });

    let accountCode = ctx.config.accountCode;
    let isGifting = ctx.input.recipients && ctx.input.recipients.length > 0;

    let result: any;

    if (isGifting) {
      result = await client.plantForOthers({
        paymentAccountCode: accountCode,
        recipients: ctx.input.recipients!,
        projectId: ctx.input.projectId,
        treeId: ctx.input.treeId,
        test: ctx.input.test
      });
    } else {
      if (!ctx.input.quantity) {
        throw new Error('Quantity is required when planting for yourself (not gifting).');
      }
      result = await client.plantForSelf({
        paymentAccountCode: accountCode,
        quantity: ctx.input.quantity,
        projectId: ctx.input.projectId,
        treeId: ctx.input.treeId,
        test: ctx.input.test
      });
    }

    let testPrefix = result.test ? '**[TEST]** ' : '';
    let actionDesc = isGifting
      ? `gifted trees to **${result.recipients?.length ?? 0}** recipient(s)`
      : `planted **${ctx.input.quantity}** tree(s) for self`;

    return {
      output: result,
      message: `${testPrefix}Successfully ${actionDesc}. Credits used: **${result.creditsUsed}**, remaining: **${result.creditsRemaining}**.`
    };
  })
  .build();
