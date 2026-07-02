import { SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let labelSchema = z.object({
  labelId: z.string().describe('Unique label ID'),
  name: z.string().describe('Label name'),
  color: z.string().optional().describe('Label color hex code'),
  description: z.string().optional().describe('Label description'),
  orgId: z.string().optional().describe('Organization ID')
});

export let listLabels = SlateTool.create(spec, {
  name: 'List Labels',
  key: 'list_labels',
  description: `List all labels in the organization. Labels can be applied to buckets, tasks, dashboards, and other resources for grouping and filtering.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      labels: z.array(labelSchema).describe('List of labels')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.listLabels();

    let labels = (result.labels || []).map((l: any) => ({
      labelId: l.id,
      name: l.name,
      color: l.properties?.color,
      description: l.properties?.description,
      orgId: l.orgID
    }));

    return {
      output: { labels },
      message: `Found **${labels.length}** label(s).`
    };
  })
  .build();

export let createLabel = SlateTool.create(spec, {
  name: 'Create Label',
  key: 'create_label',
  description: `Create a new label for organizing and grouping InfluxDB resources.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Label name'),
      color: z.string().optional().describe('Label color as hex code (e.g. "#00FF00")'),
      description: z.string().optional().describe('Label description')
    })
  )
  .output(labelSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.createLabel({
      name: ctx.input.name,
      color: ctx.input.color,
      description: ctx.input.description
    });

    let l = result.label || result;

    return {
      output: {
        labelId: l.id,
        name: l.name,
        color: l.properties?.color,
        description: l.properties?.description,
        orgId: l.orgID
      },
      message: `Created label **${l.name}** (ID: ${l.id}).`
    };
  })
  .build();

export let updateLabel = SlateTool.create(spec, {
  name: 'Update Label',
  key: 'update_label',
  description: `Update an existing label's name, color, or description.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      labelId: z.string().describe('ID of the label to update'),
      name: z.string().optional().describe('New label name'),
      color: z.string().optional().describe('New label color hex code'),
      description: z.string().optional().describe('New label description')
    })
  )
  .output(labelSchema)
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let result = await client.updateLabel(ctx.input.labelId, {
      name: ctx.input.name,
      color: ctx.input.color,
      description: ctx.input.description
    });

    let l = result.label || result;

    return {
      output: {
        labelId: l.id,
        name: l.name,
        color: l.properties?.color,
        description: l.properties?.description,
        orgId: l.orgID
      },
      message: `Updated label **${l.name}** (ID: ${l.id}).`
    };
  })
  .build();

export let deleteLabel = SlateTool.create(spec, {
  name: 'Delete Label',
  key: 'delete_label',
  description: `Permanently delete a label. The label will be removed from all associated resources.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      labelId: z.string().describe('ID of the label to delete')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the label was deleted successfully')
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    await client.deleteLabel(ctx.input.labelId);

    return {
      output: { success: true },
      message: `Deleted label ${ctx.input.labelId}.`
    };
  })
  .build();
