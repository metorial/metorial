import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageDataSource = SlateTool.create(spec, {
  name: 'Manage Data Source',
  key: 'manage_data_source',
  description: `Create or delete data sources, and add text content to existing data sources. Data sources serve as knowledge bases that AI agents reference during conversations. Also supports linking a data source to an assistant.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'delete', 'add_text', 'link_to_assistant'])
        .describe('Operation to perform'),
      datasourceId: z
        .string()
        .optional()
        .describe('Data source ID (required for delete, add_text, link_to_assistant)'),
      name: z
        .string()
        .optional()
        .describe('Name for the data source (used in create/add_text)'),
      text: z.string().optional().describe('Text content to add (for add_text action)'),
      assistantId: z
        .string()
        .optional()
        .describe('Assistant ID to link (for link_to_assistant action)')
    })
  )
  .output(
    z.object({
      datasourceId: z.string().optional(),
      name: z.string().optional(),
      deleted: z.boolean().optional(),
      linked: z.boolean().optional(),
      textAdded: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      let result = await client.createDataSource({ name: ctx.input.name });
      let data = result.data || result;
      return {
        output: {
          datasourceId: data.id,
          name: data.name
        },
        message: `Created data source **${data.name || data.id}**.`
      };
    }

    if (ctx.input.action === 'add_text') {
      await client.addTextBlob(ctx.input.datasourceId!, {
        text: ctx.input.text!,
        name: ctx.input.name
      });
      return {
        output: {
          datasourceId: ctx.input.datasourceId,
          textAdded: true
        },
        message: `Added text content to data source \`${ctx.input.datasourceId}\`.`
      };
    }

    if (ctx.input.action === 'link_to_assistant') {
      await client.linkDataSourceToAssistant(ctx.input.assistantId!, ctx.input.datasourceId!);
      return {
        output: {
          datasourceId: ctx.input.datasourceId,
          linked: true
        },
        message: `Linked data source \`${ctx.input.datasourceId}\` to assistant \`${ctx.input.assistantId}\`.`
      };
    }

    // delete
    await client.deleteDataSource(ctx.input.datasourceId!);
    return {
      output: {
        datasourceId: ctx.input.datasourceId,
        deleted: true
      },
      message: `Deleted data source \`${ctx.input.datasourceId}\`.`
    };
  })
  .build();
