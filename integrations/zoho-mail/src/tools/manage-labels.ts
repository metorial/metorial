import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let labelSchema = z.object({
  labelId: z.string().describe('Label ID'),
  labelName: z.string().optional().describe('Label name'),
  color: z.string().optional().describe('Label color')
});

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `List, create, update, or delete email labels in a Zoho Mail account. Labels are used to categorize and filter emails. To apply or remove labels from emails, use the **Update Email** tool.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      accountId: z.string().describe('Zoho Mail account ID'),
      action: z.enum(['list', 'create', 'update', 'delete']).describe('Operation to perform'),
      labelId: z.string().optional().describe('Label ID (required for update, delete)'),
      labelName: z.string().optional().describe('Label name (required for create, update)'),
      color: z.string().optional().describe('Label color hex code (e.g. "#FF0000")')
    })
  )
  .output(
    z.object({
      labels: z.array(labelSchema).optional().describe('List of labels (for list action)'),
      label: labelSchema.optional().describe('Created or updated label'),
      success: z.boolean().describe('Whether the operation succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      domain: ctx.auth.dataCenterDomain
    });

    let { action, accountId } = ctx.input;

    let mapLabel = (l: any) => ({
      labelId: String(l.labelId || l.tagId),
      labelName: l.labelName || l.tagName,
      color: l.color
    });

    if (action === 'list') {
      let labels = await client.listLabels(accountId);
      let mapped = labels.map(mapLabel);
      return {
        output: { labels: mapped, success: true },
        message: `Retrieved **${mapped.length}** label(s).`
      };
    }

    if (action === 'create') {
      if (!ctx.input.labelName) throw new Error('labelName is required for create action');
      let result = await client.createLabel(accountId, ctx.input.labelName, ctx.input.color);
      return {
        output: { label: mapLabel(result || {}), success: true },
        message: `Created label "**${ctx.input.labelName}**".`
      };
    }

    if (action === 'update') {
      if (!ctx.input.labelId) throw new Error('labelId is required for update action');
      if (!ctx.input.labelName) throw new Error('labelName is required for update action');
      let result = await client.updateLabel(
        accountId,
        ctx.input.labelId,
        ctx.input.labelName,
        ctx.input.color
      );
      return {
        output: {
          label: mapLabel(
            result || { labelId: ctx.input.labelId, labelName: ctx.input.labelName }
          ),
          success: true
        },
        message: `Updated label to "**${ctx.input.labelName}**".`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.labelId) throw new Error('labelId is required for delete action');
      await client.deleteLabel(accountId, ctx.input.labelId);
      return {
        output: { success: true },
        message: `Deleted label ${ctx.input.labelId}.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
