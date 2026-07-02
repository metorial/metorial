import { SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `List, create, search, or delete labels in Streamtime. Labels can be applied to jobs, contacts, and other entities for categorization.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'create', 'search', 'delete'])
        .describe('The operation to perform'),
      labelTypeId: z.number().optional().describe('Label type ID (required for list)'),
      entityId: z.number().optional().describe('Entity ID to filter labels for (for list)'),
      labelId: z.number().optional().describe('Label ID (required for delete)'),
      name: z.string().optional().describe('Label name (for create)'),
      createMasterLabel: z
        .boolean()
        .optional()
        .describe('Whether to also create a master label (for create)'),
      searchEntityIds: z
        .array(z.number())
        .optional()
        .describe('Array of entity IDs to search labels for (for search)')
    })
  )
  .output(
    z.object({
      labels: z.array(z.record(z.string(), z.any())).optional().describe('List of labels'),
      createdLabel: z.record(z.string(), z.any()).optional().describe('Newly created label'),
      deleted: z.boolean().optional().describe('Whether deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });
    let input = ctx.input;

    switch (input.action) {
      case 'list': {
        let params: Record<string, any> = {};
        if (input.labelTypeId !== undefined) params.label_type_id = input.labelTypeId;
        if (input.entityId !== undefined) params.entity_id = input.entityId;
        let labels = await client.listLabels(params);
        return {
          output: { labels: Array.isArray(labels) ? labels : [] },
          message: `Found **${Array.isArray(labels) ? labels.length : 0}** label(s).`
        };
      }
      case 'create': {
        let body: Record<string, any> = {};
        if (input.name !== undefined) body.name = input.name;
        if (input.labelTypeId !== undefined) body.labelTypeId = input.labelTypeId;
        if (input.entityId !== undefined) body.entityId = input.entityId;
        if (input.createMasterLabel !== undefined)
          body.createMasterLabel = input.createMasterLabel;
        let label = await client.createLabel(body);
        return {
          output: { createdLabel: label },
          message: `Created label${input.name ? ` **${input.name}**` : ''}.`
        };
      }
      case 'search': {
        let body: Record<string, any> = {};
        if (input.searchEntityIds) body.entityIds = input.searchEntityIds;
        if (input.labelTypeId !== undefined) body.labelTypeId = input.labelTypeId;
        let result = await client.searchLabels(body);
        let labels = Array.isArray(result) ? result : result.data || result.results || [];
        return {
          output: { labels },
          message: `Found **${labels.length}** label(s) matching the search.`
        };
      }
      case 'delete': {
        if (!input.labelId) throw new Error('labelId is required for delete');
        await client.deleteLabel(input.labelId);
        return {
          output: { deleted: true },
          message: `Deleted label (ID: ${input.labelId}).`
        };
      }
    }
  })
  .build();
