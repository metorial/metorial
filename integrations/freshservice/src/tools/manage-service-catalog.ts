import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listServiceCatalogItems = SlateTool.create(spec, {
  name: 'List Service Catalog Items',
  key: 'list_service_catalog_items',
  description: `List service catalog items, optionally filtered by category. Service catalog items are predefined service offerings that users can request.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      categoryId: z.number().optional().describe('Filter by service category ID'),
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      items: z.array(
        z.object({
          itemId: z.number().describe('Service item ID'),
          name: z.string().describe('Item name'),
          description: z.string().nullable().describe('Description'),
          shortDescription: z.string().nullable().describe('Short description'),
          categoryId: z.number().nullable().describe('Category ID'),
          visibility: z.number().nullable().describe('Visibility setting'),
          createdAt: z.string().describe('Creation timestamp')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listServiceItems(ctx.input.categoryId, {
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let items = result.items.map((i: Record<string, unknown>) => ({
      itemId: i.id as number,
      name: i.name as string,
      description: i.description as string | null,
      shortDescription: i.short_description as string | null,
      categoryId: i.category_id as number | null,
      visibility: i.visibility as number | null,
      createdAt: i.created_at as string
    }));

    return {
      output: { items },
      message: `Found **${items.length}** service catalog items`
    };
  })
  .build();

export let getServiceCatalogItem = SlateTool.create(spec, {
  name: 'Get Service Catalog Item',
  key: 'get_service_catalog_item',
  description: `Retrieve a single service catalog item with its full details, including custom fields and configuration.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      itemId: z.number().describe('ID of the service catalog item')
    })
  )
  .output(
    z.object({
      itemId: z.number().describe('Service item ID'),
      name: z.string().describe('Item name'),
      description: z.string().nullable().describe('Full description'),
      shortDescription: z.string().nullable().describe('Short description'),
      categoryId: z.number().nullable().describe('Category ID'),
      visibility: z.number().nullable().describe('Visibility setting'),
      createdAt: z.string().describe('Creation timestamp'),
      updatedAt: z.string().describe('Last update timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let item = await client.getServiceItem(ctx.input.itemId);

    return {
      output: {
        itemId: item.id,
        name: item.name,
        description: item.description,
        shortDescription: item.short_description,
        categoryId: item.category_id,
        visibility: item.visibility,
        createdAt: item.created_at,
        updatedAt: item.updated_at
      },
      message: `Retrieved service item **#${item.id}**: "${item.name}"`
    };
  })
  .build();

export let placeServiceRequest = SlateTool.create(spec, {
  name: 'Place Service Request',
  key: 'place_service_request',
  description: `Place a new service request for a catalog item. This creates a ticket of type "Service Request" linked to the specified service item.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      itemId: z.number().describe('ID of the service catalog item to request'),
      email: z.string().optional().describe('Email of the requester'),
      requesterId: z.number().optional().describe('ID of the requester'),
      quantity: z.number().optional().describe('Quantity to request (default: 1)'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom field values for the service request')
    })
  )
  .output(
    z.object({
      ticketId: z.number().describe('ID of the created service request ticket'),
      subject: z.string().nullable().describe('Subject of the service request'),
      status: z.number().describe('Status'),
      createdAt: z.string().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let { itemId, ...params } = ctx.input;
    let request = await client.placeServiceRequest(itemId, params);

    return {
      output: {
        ticketId: request.id,
        subject: request.subject,
        status: request.status,
        createdAt: request.created_at
      },
      message: `Placed service request creating ticket **#${request.id}**`
    };
  })
  .build();

export let listServiceCategories = SlateTool.create(spec, {
  name: 'List Service Categories',
  key: 'list_service_categories',
  description: `List all service catalog categories. Categories organize service items into logical groups.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      page: z.number().optional().describe('Page number'),
      perPage: z.number().optional().describe('Results per page')
    })
  )
  .output(
    z.object({
      categories: z.array(
        z.object({
          categoryId: z.number().describe('Category ID'),
          name: z.string().describe('Category name'),
          description: z.string().nullable().describe('Description')
        })
      )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      subdomain: ctx.config.subdomain,
      authType: ctx.auth.authType
    });

    let result = await client.listServiceCategories({
      page: ctx.input.page,
      perPage: ctx.input.perPage
    });

    let categories = result.categories.map((c: Record<string, unknown>) => ({
      categoryId: c.id as number,
      name: c.name as string,
      description: c.description as string | null
    }));

    return {
      output: { categories },
      message: `Found **${categories.length}** service categories`
    };
  })
  .build();
