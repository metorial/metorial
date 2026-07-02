import { SlateTool } from 'slates';
import { z } from 'zod';
import { SeqeraClient } from '../lib/client';
import { spec } from '../spec';

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Resource Labels',
  key: 'manage_labels',
  description: `List, create, update, or delete resource labels. Labels are used to tag pipelines, workflow runs, and compute environments for cost tracking and organizational purposes across teams and workspaces.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Action to perform'),
      labelId: z.number().optional().describe('Label ID (required for update and delete)'),
      name: z.string().optional().describe('Label name (required for create)'),
      value: z.string().optional().describe('Label value'),
      isDefault: z
        .boolean()
        .optional()
        .describe('Whether the label is applied by default to new resources')
    })
  )
  .output(
    z.object({
      labels: z
        .array(
          z.object({
            labelId: z.number().optional(),
            name: z.string().optional(),
            value: z.string().optional(),
            isDefault: z.boolean().optional()
          })
        )
        .optional()
        .describe('List of labels (for list action)'),
      labelId: z.number().optional().describe('Created or affected label ID'),
      deleted: z.boolean().optional().describe('Whether the label was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SeqeraClient({
      token: ctx.auth.token,
      baseUrl: ctx.config.baseUrl,
      workspaceId: ctx.config.workspaceId
    });

    if (ctx.input.action === 'list') {
      let labels = await client.listLabels();
      return {
        output: {
          labels: labels.map(l => ({
            labelId: l.id,
            name: l.name,
            value: l.value,
            isDefault: l.isDefault
          }))
        },
        message: `Found **${labels.length}** resource labels.`
      };
    }

    if (ctx.input.action === 'create') {
      if (!ctx.input.name) throw new Error('name is required to create a label');
      let label = await client.createLabel({
        name: ctx.input.name,
        value: ctx.input.value,
        isDefault: ctx.input.isDefault
      });
      return {
        output: { labelId: label.id },
        message: `Label **${ctx.input.name}**${ctx.input.value ? `=${ctx.input.value}` : ''} created.`
      };
    }

    if (!ctx.input.labelId) throw new Error('labelId is required for update and delete');

    if (ctx.input.action === 'delete') {
      await client.deleteLabel(ctx.input.labelId);
      return {
        output: { labelId: ctx.input.labelId, deleted: true },
        message: `Label **${ctx.input.labelId}** deleted.`
      };
    }

    // update
    await client.updateLabel(ctx.input.labelId, {
      name: ctx.input.name,
      value: ctx.input.value,
      isDefault: ctx.input.isDefault
    });
    return {
      output: { labelId: ctx.input.labelId },
      message: `Label **${ctx.input.labelId}** updated.`
    };
  })
  .build();
