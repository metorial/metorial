import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let labelSchema = z.object({
  labelId: z.string().describe('Label ID'),
  name: z.string().describe('Label name'),
  color: z.string().describe('Label color'),
  order: z.number().describe('Display order'),
  isFavorite: z.boolean().describe('Whether label is favorited')
});

export let getLabels = SlateTool.create(spec, {
  name: 'Get Labels',
  key: 'get_labels',
  description: `List all personal labels. Labels are used to categorize and tag tasks across projects.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      labels: z.array(labelSchema).describe('Retrieved labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let labels = await client.getLabels();

    return {
      output: {
        labels: labels.map(l => ({
          labelId: l.id,
          name: l.name,
          color: l.color,
          order: l.order,
          isFavorite: l.isFavorite
        }))
      },
      message: `Retrieved **${labels.length}** label(s).`
    };
  });

export let createLabel = SlateTool.create(spec, {
  name: 'Create Label',
  key: 'create_label',
  description: `Create a new personal label for organizing tasks.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Label name'),
      color: z.string().optional().describe('Color name (e.g. "berry_red", "blue", "green")'),
      order: z.number().optional().describe('Display order'),
      isFavorite: z.boolean().optional().describe('Mark as favorite')
    })
  )
  .output(labelSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let label = await client.createLabel(ctx.input);

    return {
      output: {
        labelId: label.id,
        name: label.name,
        color: label.color,
        order: label.order,
        isFavorite: label.isFavorite
      },
      message: `Created label **"${label.name}"** (ID: ${label.id}).`
    };
  });

export let updateLabel = SlateTool.create(spec, {
  name: 'Update Label',
  key: 'update_label',
  description: `Update a personal label's name, color, order, or favorite status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      labelId: z.string().describe('Label ID to update'),
      name: z.string().optional().describe('New label name'),
      color: z.string().optional().describe('New color name'),
      order: z.number().optional().describe('New display order'),
      isFavorite: z.boolean().optional().describe('Favorite status')
    })
  )
  .output(labelSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { labelId, ...updateData } = ctx.input;
    let label = await client.updateLabel(labelId, updateData);

    return {
      output: {
        labelId: label.id,
        name: label.name,
        color: label.color,
        order: label.order,
        isFavorite: label.isFavorite
      },
      message: `Updated label **"${label.name}"** (ID: ${label.id}).`
    };
  });

export let deleteLabel = SlateTool.create(spec, {
  name: 'Delete Label',
  key: 'delete_label',
  description: `Delete a personal label. The label is removed from all tasks.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      labelId: z.string().describe('Label ID to delete')
    })
  )
  .output(
    z.object({
      labelId: z.string().describe('Deleted label ID')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteLabel(ctx.input.labelId);

    return {
      output: { labelId: ctx.input.labelId },
      message: `Deleted label (ID: ${ctx.input.labelId}).`
    };
  });
