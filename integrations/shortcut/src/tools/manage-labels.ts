import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `Create, update, or delete labels. Labels are used to organize and filter stories and epics.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'delete']).describe('Action to perform'),
      labelId: z.number().optional().describe('Label ID (required for update and delete)'),
      name: z.string().optional().describe('Label name (required for create)'),
      description: z.string().optional().describe('Label description'),
      color: z.string().optional().describe('Label color as hex code (e.g., "#ff0000")')
    })
  )
  .output(
    z.object({
      labelId: z.number().nullable().describe('ID of the created/updated label'),
      name: z.string().nullable().describe('Label name'),
      color: z.string().nullable().describe('Label color'),
      deleted: z.boolean().optional().describe('Whether the label was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('Name is required to create a label');
      let params: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.description !== undefined) params.description = ctx.input.description;
      if (ctx.input.color !== undefined) params.color = ctx.input.color;

      let label = await client.createLabel(params);

      return {
        output: {
          labelId: label.id,
          name: label.name,
          color: label.color ?? null
        },
        message: `Created label **${label.name}** (ID: ${label.id})`
      };
    }

    if (ctx.input.action === 'update') {
      if (!ctx.input.labelId) throw new Error('Label ID is required for update');
      let params: Record<string, any> = {};
      if (ctx.input.name !== undefined) params.name = ctx.input.name;
      if (ctx.input.description !== undefined) params.description = ctx.input.description;
      if (ctx.input.color !== undefined) params.color = ctx.input.color;

      let label = await client.updateLabel(ctx.input.labelId, params);

      return {
        output: {
          labelId: label.id,
          name: label.name,
          color: label.color ?? null
        },
        message: `Updated label **${label.name}** (ID: ${label.id})`
      };
    }

    // delete
    if (!ctx.input.labelId) throw new Error('Label ID is required for delete');
    await client.deleteLabel(ctx.input.labelId);

    return {
      output: {
        labelId: null,
        name: null,
        color: null,
        deleted: true
      },
      message: `Deleted label with ID ${ctx.input.labelId}`
    };
  })
  .build();
