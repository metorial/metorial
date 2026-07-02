import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { labelSchema } from '../lib/types';
import { spec } from '../spec';

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Ticket Labels',
  key: 'manage_labels',
  description: `Add or remove labels from a ticket. Supports adding multiple labels and removing multiple labels in a single operation. Can also list all available labels for the company.`,
  instructions: [
    'Provide labelsToAdd and/or labelsToRemove arrays with label names.',
    'Set listAvailable to true to retrieve all custom labels for the company.'
  ]
})
  .input(
    z.object({
      ticketId: z
        .number()
        .optional()
        .describe(
          'The ID of the ticket to modify labels on. Required when adding or removing labels.'
        ),
      labelsToAdd: z.array(z.string()).optional().describe('Label names to add to the ticket'),
      labelsToRemove: z
        .array(z.string())
        .optional()
        .describe('Label names to remove from the ticket'),
      listAvailable: z
        .boolean()
        .optional()
        .describe('If true, returns all available custom labels for the company')
    })
  )
  .output(
    z.object({
      added: z.array(z.string()).optional().describe('Labels that were added'),
      removed: z.array(z.string()).optional().describe('Labels that were removed'),
      availableLabels: z.array(labelSchema).optional().describe('All available custom labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      companySubdomain: ctx.config.companySubdomain
    });

    let added: string[] = [];
    let removed: string[] = [];
    let availableLabels: any;

    if (ctx.input.listAvailable) {
      availableLabels = await client.listLabels();
    }

    if (ctx.input.ticketId && ctx.input.labelsToAdd) {
      for (let label of ctx.input.labelsToAdd) {
        await client.addLabel(ctx.input.ticketId, label);
        added.push(label);
      }
    }

    if (ctx.input.ticketId && ctx.input.labelsToRemove) {
      for (let label of ctx.input.labelsToRemove) {
        await client.removeLabel(ctx.input.ticketId, label);
        removed.push(label);
      }
    }

    let messageParts: string[] = [];
    if (added.length > 0) messageParts.push(`Added labels: ${added.join(', ')}`);
    if (removed.length > 0) messageParts.push(`Removed labels: ${removed.join(', ')}`);
    if (availableLabels)
      messageParts.push(`Found **${availableLabels.length}** available labels`);

    return {
      output: {
        added: added.length > 0 ? added : undefined,
        removed: removed.length > 0 ? removed : undefined,
        availableLabels
      },
      message: messageParts.length > 0 ? messageParts.join('. ') : 'No label actions performed'
    };
  })
  .build();
