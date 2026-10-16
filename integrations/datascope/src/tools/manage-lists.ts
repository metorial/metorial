import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, expectArray } from '../lib/client';
import { spec } from '../spec';

export let getListElements = SlateTool.create(spec, {
  name: 'Get List Elements',
  key: 'get_list_elements',
  description: `Retrieve elements from a custom list (metadata) in DataScope. Lists can contain products, equipment, or other reference data used in forms. Optionally retrieve a single element by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      listName: z.string().describe('Name/identifier of the list (metadata_type)'),
      elementId: z
        .string()
        .optional()
        .describe('If provided, retrieves only this specific element')
    })
  )
  .output(
    z.object({
      elements: z.array(z.any()).describe('Array of list element records'),
      count: z.number().describe('Number of elements returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.elementId) {
      let result = await client.getListElement(ctx.input.listName, ctx.input.elementId);
      if (!isApiErrorRecord(result)) {
        throw createApiServiceError('DataScope returned an invalid list element response.');
      }
      let elements = [result];
      return {
        output: { elements, count: elements.length },
        message: `Retrieved element **${ctx.input.elementId}** from list **"${ctx.input.listName}"**.`
      };
    }

    let results = await client.getListElements(ctx.input.listName);
    let elements = expectArray(results, 'list elements');

    return {
      output: { elements, count: elements.length },
      message: `Retrieved **${elements.length}** element(s) from list **"${ctx.input.listName}"**.`
    };
  })
  .build();

export let createListElement = SlateTool.create(spec, {
  name: 'Create List Element',
  key: 'create_list_element',
  description: `Add a new element to a custom list in DataScope. Each element has a name, description, code, and two custom attributes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      listName: z.string().describe('Name/identifier of the list (metadata_type)'),
      name: z.string().describe('Element name'),
      description: z.string().optional().describe('Element description'),
      code: z.string().optional().describe('Element code identifier'),
      attribute1: z.string().optional().describe('Custom attribute 1'),
      attribute2: z.string().optional().describe('Custom attribute 2')
    })
  )
  .output(
    z.object({
      element: z.any().describe('Created list element record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { listName, ...elementData } = ctx.input;
    let result = await client.createListElement(listName, elementData);

    return {
      output: { element: result },
      message: `Created element **"${ctx.input.name}"** in list **"${listName}"**.`
    };
  })
  .build();

export let updateListElement = SlateTool.create(spec, {
  name: 'Update List Element',
  key: 'update_list_element',
  description: `Update an existing element in a custom list. Any provided fields will be updated; omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      elementId: z.string().describe('ID of the list element to update'),
      name: z.string().optional().describe('New element name'),
      description: z.string().optional().describe('New element description'),
      code: z.string().optional().describe('New element code'),
      attribute1: z.string().optional().describe('New custom attribute 1'),
      attribute2: z.string().optional().describe('New custom attribute 2')
    })
  )
  .output(
    z.object({
      element: z.any().describe('Updated list element record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { elementId, ...fields } = ctx.input;
    let result = await client.updateListElement(elementId, fields);

    return {
      output: { element: result },
      message: `Updated list element **${elementId}**.`
    };
  })
  .build();

export let createList = SlateTool.create(spec, {
  name: 'Create List',
  key: 'create_list',
  description: `Create a new custom list (metadata type) in DataScope. Lists hold reference data (e.g., products, equipment) that can be used in form questions. Supports standard, percent, and price list types.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('List name'),
      description: z.string().optional().describe('List description'),
      code: z.string().optional().describe('List code identifier'),
      listType: z
        .enum(['standard', 'percent', 'price'])
        .optional()
        .describe('Type of list (defaults to standard)')
    })
  )
  .output(
    z.object({
      list: z.any().describe('Created list record')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createList(ctx.input);

    return {
      output: { list: result },
      message: `Created list **"${ctx.input.name}"** of type **${ctx.input.listType ?? 'standard'}**.`
    };
  })
  .build();

export let bulkUpdateListElements = SlateTool.create(spec, {
  name: 'Bulk Update List Elements',
  key: 'bulk_update_list_elements',
  description: `Replace all elements in a custom list at once. This is a destructive operation — all existing elements in the list are removed and replaced with the provided elements.

Use this for syncing or resetting list contents. Does **not** apply to locations — use the location tools for those.`,
  constraints: [
    'Replaces ALL existing elements in the list. Omitted elements will be deleted.',
    'Does not work with location lists — use the dedicated location management tools instead.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      listName: z.string().describe('Name/identifier of the list (metadata_type)'),
      listDisplayName: z.string().describe('Display name for the list'),
      elements: z
        .array(
          z.object({
            code: z.string().describe('Element code'),
            name: z.string().describe('Element name'),
            description: z.string().optional().describe('Element description'),
            attribute1: z.string().optional().describe('Custom attribute 1'),
            attribute2: z.string().optional().describe('Custom attribute 2')
          })
        )
        .describe('Complete set of elements to populate the list with')
    })
  )
  .output(
    z.object({
      response: z.any().describe('API response from the bulk update'),
      elementCount: z.number().describe('Number of elements set')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.bulkUpdateListElements({
      metadataType: ctx.input.listName,
      name: ctx.input.listDisplayName,
      elements: ctx.input.elements
    });

    if (!isApiErrorRecord(result) || typeof result.length !== 'number') {
      throw createApiServiceError('DataScope did not return the resulting list length.');
    }

    return {
      output: {
        response: result,
        elementCount: result.length
      },
      message: `Replaced all elements in list **"${ctx.input.listName}"** with **${result.length}** active element(s).`
    };
  })
  .build();

export let updateList = SlateTool.create(spec, {
  name: 'Update List',
  key: 'update_list',
  description:
    'Update the name, description, code, or type of an existing custom list without replacing its elements.',
  tags: { destructive: false }
})
  .input(
    z.object({
      listId: z
        .string()
        .describe('Internal list ID returned when creating a list or by list element records'),
      name: z.string().optional().describe('New list name'),
      description: z.string().optional().describe('New list description'),
      code: z.string().optional().describe('New list code'),
      listType: z.enum(['standard', 'percent', 'price']).optional().describe('New list type')
    })
  )
  .output(z.object({ list: z.any().describe('Unmodified updated list record') }))
  .handleInvocation(async ctx => {
    let { listId, ...fields } = ctx.input;
    let list = await new Client(ctx.auth).updateList(listId, fields);
    return { output: { list }, message: 'Updated the custom list.' };
  })
  .build();
