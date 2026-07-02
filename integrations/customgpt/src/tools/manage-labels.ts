import { SlateTool } from 'slates';
import { z } from 'zod';
import { CustomGPTClient } from '../lib/client';
import { spec } from '../spec';

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `Create, list, rename, or delete labels for an AI agent. Labels are used to organize documents and control user access to specific content within the agent's knowledge base.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'create', 'rename', 'delete']).describe('Action to perform'),
      projectId: z.number().describe('ID of the agent'),
      labelId: z.number().optional().describe('Label ID (required for rename and delete)'),
      name: z.string().optional().describe('Label name (required for create and rename)')
    })
  )
  .output(
    z.object({
      labels: z
        .array(z.record(z.string(), z.unknown()))
        .optional()
        .describe('List of labels (for list action)'),
      createdLabel: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Newly created label'),
      renamedLabel: z.record(z.string(), z.unknown()).optional().describe('Renamed label'),
      deleted: z.boolean().optional().describe('Whether the label was deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new CustomGPTClient({ token: ctx.auth.token });
    let { action, projectId } = ctx.input;

    if (action === 'list') {
      let labels = await client.listLabels(projectId);
      return {
        output: { labels },
        message: `Found **${labels.length}** label(s) for agent **${projectId}**.`
      };
    }

    if (action === 'create') {
      if (!ctx.input.name) {
        throw new Error('name is required for create action');
      }
      let label = await client.createLabel(projectId, ctx.input.name);
      return {
        output: { createdLabel: label },
        message: `Created label **${ctx.input.name}** for agent **${projectId}**.`
      };
    }

    if (!ctx.input.labelId) {
      throw new Error('labelId is required for rename and delete actions');
    }

    if (action === 'rename') {
      if (!ctx.input.name) {
        throw new Error('name is required for rename action');
      }
      let label = await client.renameLabel(projectId, ctx.input.labelId, ctx.input.name);
      return {
        output: { renamedLabel: label },
        message: `Renamed label **${ctx.input.labelId}** to **${ctx.input.name}**.`
      };
    }

    // delete
    await client.deleteLabel(projectId, ctx.input.labelId);
    return {
      output: { deleted: true },
      message: `Deleted label **${ctx.input.labelId}** from agent **${projectId}**.`
    };
  })
  .build();
