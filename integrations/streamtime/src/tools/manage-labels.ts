import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { StreamtimeClient } from '../lib/client';
import { spec } from '../spec';

export let manageLabels = SlateTool.create(spec, {
  name: 'Manage Labels',
  key: 'manage_labels',
  description: `List, create, search, or delete labels in Streamtime. Labels can be applied to jobs, contacts, and other entities for categorization.`,
  tags: {
    destructive: true,
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
      entityIdsByType: z
        .record(z.string(), z.array(z.number()))
        .optional()
        .describe(
          'Map provider entity class names to IDs, such as {"Job": [101], "Quote": [201], "User": [301]}. Alternative to searchEntityIds plus labelTypeId.'
        ),
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
      deleted: z.boolean().optional().describe('Whether deletion was successful'),
      raw: z.any().optional().describe('Complete grouped label search response')
    })
  )
  .handleInvocation(async ctx => {
    let client = new StreamtimeClient({ token: ctx.auth.token });
    let input = ctx.input;

    switch (input.action) {
      case 'list': {
        if (input.labelTypeId === undefined)
          throw createApiServiceError('labelTypeId is required for list.');
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
        if (input.labelTypeId !== undefined) body.labelType = { id: input.labelTypeId };
        if (input.entityId !== undefined) body.entityId = input.entityId;
        if (
          !input.name?.trim() ||
          input.labelTypeId === undefined ||
          input.entityId === undefined
        ) {
          throw createApiServiceError(
            'name, labelTypeId, and entityId are required to create a label.'
          );
        }
        let label = await client.createLabel(body, input.createMasterLabel);
        return {
          output: { createdLabel: label },
          message: `Created label${input.name ? ` **${input.name}**` : ''}.`
        };
      }
      case 'search': {
        let body = input.entityIdsByType;
        if (body && input.searchEntityIds !== undefined) {
          throw createApiServiceError('Provide entityIdsByType or searchEntityIds, not both.');
        }
        if (!body) {
          let entityTypes: Record<number, string> = {
            1: 'Job',
            2: 'Quote',
            3: 'Invoice',
            4: 'LoggedExpense',
            5: 'Company',
            6: 'Contact',
            7: 'User',
            8: 'JobGroup'
          };
          let entityType =
            input.labelTypeId === undefined ? undefined : entityTypes[input.labelTypeId];
          if (!entityType || !input.searchEntityIds?.length) {
            throw createApiServiceError(
              'Provide entityIdsByType, or non-empty searchEntityIds with labelTypeId from 1 to 8.'
            );
          }
          body = { [entityType]: input.searchEntityIds };
        }
        if (!Object.keys(body).length)
          throw createApiServiceError('Provide at least one entity type to search.');
        let result = await client.searchLabels(body);
        let labels: Record<string, unknown>[] = [];
        let collectLabels = (value: unknown): void => {
          if (Array.isArray(value)) {
            for (let entry of value) collectLabels(entry);
          } else if (isApiErrorRecord(value)) {
            if (typeof value.name === 'string' && typeof value.id === 'number') {
              labels.push(value);
            } else {
              for (let entry of Object.values(value)) collectLabels(entry);
            }
          }
        };
        collectLabels(result);
        return {
          output: { labels, raw: result },
          message: `Retrieved **${labels.length}** label(s); the full grouped response is also included.`
        };
      }
      case 'delete': {
        if (!input.labelId) throw createApiServiceError('labelId is required for delete');
        await client.deleteLabel(input.labelId);
        return {
          output: { deleted: true },
          message: `Deleted label (ID: ${input.labelId}).`
        };
      }
    }
  })
  .build();
