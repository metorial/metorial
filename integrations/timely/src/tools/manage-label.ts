import { SlateTool } from 'slates';
import { z } from 'zod';
import { TimelyClient } from '../lib/client';
import { spec } from '../spec';

export let manageLabel = SlateTool.create(spec, {
  name: 'Manage Label',
  key: 'manage_label',
  description: `Create or update a label (tag) in Timely. Provide a **labelId** to update an existing label, or omit it to create a new one. Labels can have a parent for hierarchical organization.`,
  tags: { destructive: false }
})
  .input(
    z.object({
      labelId: z
        .string()
        .optional()
        .describe('Label ID to update. Omit to create a new label'),
      name: z.string().describe('Label name'),
      parentId: z.number().optional().describe('Parent label ID for hierarchical structure'),
      emoji: z.string().optional().describe('Custom emoji for the label'),
      active: z
        .boolean()
        .optional()
        .describe('Set to false to archive the label (update only)')
    })
  )
  .output(
    z.object({
      labelId: z.number().describe('Label ID'),
      name: z.string().describe('Label name'),
      parentId: z.number().nullable().describe('Parent label ID'),
      emoji: z.string().nullable().describe('Emoji'),
      active: z.boolean().describe('Whether the label is active')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TimelyClient({
      accountId: ctx.config.accountId,
      token: ctx.auth.token
    });

    let result: any;
    let action: string;

    if (ctx.input.labelId) {
      result = await client.updateLabel(ctx.input.labelId, {
        name: ctx.input.name,
        parentId: ctx.input.parentId,
        emoji: ctx.input.emoji,
        active: ctx.input.active
      });
      action = 'Updated';
    } else {
      result = await client.createLabel({
        name: ctx.input.name,
        parentId: ctx.input.parentId,
        emoji: ctx.input.emoji
      });
      action = 'Created';
    }

    return {
      output: {
        labelId: result.id,
        name: result.name,
        parentId: result.parent_id ?? null,
        emoji: result.emoji ?? null,
        active: result.active ?? true
      },
      message: `${action} label **${result.name}** (ID: ${result.id}).`
    };
  })
  .build();
