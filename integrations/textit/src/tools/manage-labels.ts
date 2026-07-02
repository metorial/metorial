import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `Create, update, or delete message labels. Labels are used to categorize and organize incoming messages.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      labelUuid: z
        .string()
        .optional()
        .describe('UUID of the label (required for update/delete)'),
      name: z
        .string()
        .optional()
        .describe('Name of the label (required for create and update)')
    })
  )
  .output(
    z.object({
      labelUuid: z.string().optional().describe('UUID of the label'),
      name: z.string().optional().describe('Name of the label'),
      count: z.number().optional().describe('Number of messages with this label')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth.token);

    if (ctx.input.action === 'delete') {
      await client.deleteLabel(ctx.input.labelUuid!);
      return {
        output: {},
        message: `Label deleted successfully.`
      };
    }

    let label: any;
    if (ctx.input.action === 'create') {
      label = await client.createLabel({ name: ctx.input.name! });
    } else {
      label = await client.updateLabel(ctx.input.labelUuid!, { name: ctx.input.name! });
    }

    return {
      output: {
        labelUuid: label.uuid,
        name: label.name,
        count: label.count
      },
      message: `Label **${label.name}** ${ctx.input.action === 'create' ? 'created' : 'updated'} successfully.`
    };
  })
  .build();
