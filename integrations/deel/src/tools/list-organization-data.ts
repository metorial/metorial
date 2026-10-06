import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import {
  dataList,
  pageSchema,
  resourceSchema,
  responsePage,
  validateLimit
} from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

export let listOrganizationData = SlateTool.create(spec, {
  name: 'List Organization Data',
  key: 'list_organization_data',
  description: `Retrieve organizational structure data from Deel. Can list legal entities, teams/groups, or departments. Useful for finding IDs needed when creating contracts.`,
  tags: {
    readOnly: true
  }
})
  .scopes(anyOf('organizations:read', 'accounting:read'))
  .input(
    z.object({
      resourceType: z
        .enum(['legal_entities', 'teams', 'departments'])
        .describe('Type of organization data to list'),
      limit: z.number().optional().describe('For legal_entities: page size 1–100'),
      cursor: z
        .string()
        .optional()
        .describe('For legal_entities: nextCursor from the previous result'),
      includeArchived: z
        .boolean()
        .optional()
        .describe('For legal_entities: include archived entities')
    })
  )
  .output(
    z.object({
      items: z.array(resourceSchema).describe('List of organization resources'),
      page: pageSchema.optional(),
      nextCursor: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    validateLimit(ctx.input.limit, 100);
    if (
      ctx.input.resourceType !== 'legal_entities' &&
      (ctx.input.limit !== undefined ||
        ctx.input.cursor !== undefined ||
        ctx.input.includeArchived !== undefined)
    )
      throw createApiServiceError(
        'Pagination and archive filters apply only to legal_entities.'
      );
    let client = createClient(ctx);

    let result: unknown;

    switch (ctx.input.resourceType) {
      case 'legal_entities':
        result = await client.listLegalEntities({
          limit: ctx.input.limit,
          cursor: ctx.input.cursor,
          include_archived: ctx.input.includeArchived
        });
        break;
      case 'teams':
        result = await client.listGroups();
        break;
      case 'departments':
        result = await client.listDepartments();
        break;
    }

    let items = dataList(result, 'organization data');
    let page = responsePage(result);

    return {
      output: { items, page, nextCursor: page?.cursor },
      message: `Found ${items.length} ${ctx.input.resourceType.replace(/_/g, ' ')}.`
    };
  })
  .build();
