import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client, invalid } from '../lib/client';
import { spec } from '../spec';

export let manageLeadLabels = SlateTool.create(spec, {
  name: 'Manage Lead Labels',
  key: 'manage_lead_labels',
  description: `List, create, update, or delete lead labels. Labels categorize lead statuses and responses within campaigns. Current labels have a positive, negative, or neutral category; the current API does not expose color settings.`,
  instructions: [
    'Use action "list" to view all lead labels.',
    'Use action "create" with a name and interestStatusLabel category.',
    'Use action "update" to change the name, category, or description of an existing label.',
    'Use action "delete" to remove a label by its ID.'
  ]
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform.'),
      labelId: z
        .string()
        .optional()
        .describe('ID of the label (for "update" and "delete" actions).'),
      name: z.string().optional().describe('Label name (for "create" and "update" actions).'),
      color: z
        .string()
        .optional()
        .describe(
          'Legacy color field. Current API does not support color updates; omit this field.'
        ),
      interestStatusLabel: z
        .enum(['positive', 'negative', 'neutral'])
        .optional()
        .describe('Required category for create; optional for update.'),
      description: z.string().optional().describe('Description for create or update.'),
      limit: z
        .number()
        .min(1)
        .max(100)
        .optional()
        .describe('Number of labels to return (for "list" action).'),
      startingAfter: z
        .string()
        .optional()
        .describe('Cursor for pagination (for "list" action).')
    })
  )
  .output(
    z.object({
      labels: z
        .array(
          z.object({
            labelId: z.string().describe('Label ID'),
            name: z.string().optional().describe('Label name'),
            color: z.string().optional().describe('Label color'),
            interestValue: z.number().optional().describe('Associated interest status value')
          })
        )
        .optional()
        .describe('List of labels (for "list" action)'),
      nextStartingAfter: z.string().nullable().optional().describe('Cursor for next page'),
      label: z.any().optional().describe('Created or updated label details'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'list') {
      let result = await client.listLeadLabels({
        limit: ctx.input.limit,
        startingAfter: ctx.input.startingAfter
      });

      let labels = result.items.map((l: any) => ({
        labelId: l.id,
        name: l.label,
        interestValue: l.interest_status
      }));

      return {
        output: {
          labels,
          nextStartingAfter: result.next_starting_after ?? null,
          success: true
        },
        message: `Found **${labels.length}** lead label(s).`
      };
    }

    if (action === 'create' && ctx.input.name) {
      if (ctx.input.color !== undefined)
        throw invalid('The current lead-label API does not support color. Omit color.');
      if (!ctx.input.interestStatusLabel)
        throw invalid(
          'Provide interestStatusLabel: positive, negative, or neutral to create a label.'
        );
      let result = await client.createLeadLabel({
        name: ctx.input.name,
        interestStatusLabel: ctx.input.interestStatusLabel,
        description: ctx.input.description
      });
      return {
        output: { label: result, success: true },
        message: `Created lead label **${ctx.input.name}**.`
      };
    }

    if (action === 'update' && ctx.input.labelId) {
      if (ctx.input.color !== undefined)
        throw invalid('The current lead-label API does not support color. Omit color.');
      if (
        ctx.input.name === undefined &&
        ctx.input.interestStatusLabel === undefined &&
        ctx.input.description === undefined
      ) {
        throw invalid('Provide a name, interestStatusLabel, or description to update.');
      }
      let result = await client.updateLeadLabel(ctx.input.labelId, {
        name: ctx.input.name,
        interestStatusLabel: ctx.input.interestStatusLabel,
        description: ctx.input.description
      });
      return {
        output: { label: result, success: true },
        message: `Updated lead label ${ctx.input.labelId}.`
      };
    }

    if (action === 'delete' && ctx.input.labelId) {
      await client.deleteLeadLabel(ctx.input.labelId);
      return {
        output: { success: true },
        message: `Deleted lead label ${ctx.input.labelId}.`
      };
    }

    throw invalid('Provide the required fields for the selected action.');
  })
  .build();
