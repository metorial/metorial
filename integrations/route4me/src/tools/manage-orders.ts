import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createOrder = SlateTool.create(spec, {
  name: 'Create Order',
  key: 'create_order',
  description: `Create a new order for route planning. Orders represent customer deliveries or pickups that can be optimized into routes.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      address1: z.string().describe('Street address for the order'),
      addressAlias: z.string().optional().describe('Friendly name for the address'),
      lat: z.number().optional().describe('Latitude'),
      lng: z.number().optional().describe('Longitude'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      email: z.string().optional().describe('Customer email'),
      phone: z.string().optional().describe('Customer phone'),
      addressCity: z.string().optional().describe('City'),
      addressStateId: z.string().optional().describe('State/province'),
      addressZip: z.string().optional().describe('ZIP/postal code'),
      addressCountryId: z.string().optional().describe('Country code'),
      dayScheduledFor: z.string().optional().describe('Scheduled date (YYYY-MM-DD)'),
      weight: z.number().optional().describe('Order weight'),
      cost: z.number().optional().describe('Order cost'),
      revenue: z.number().optional().describe('Order revenue'),
      customFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value fields')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Created order ID'),
      address1: z.string().optional().describe('Order address'),
      dayScheduledFor: z.string().optional().describe('Scheduled date'),
      createdTimestamp: z.number().optional().describe('Creation timestamp')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      address_1: ctx.input.address1,
      address_alias: ctx.input.addressAlias,
      cached_lat: ctx.input.lat,
      cached_lng: ctx.input.lng,
      EXT_FIELD_first_name: ctx.input.firstName,
      EXT_FIELD_last_name: ctx.input.lastName,
      EXT_FIELD_email: ctx.input.email,
      EXT_FIELD_phone: ctx.input.phone,
      address_city: ctx.input.addressCity,
      address_state_id: ctx.input.addressStateId,
      address_zip: ctx.input.addressZip,
      address_country_id: ctx.input.addressCountryId,
      day_scheduled_for_YYMMDD: ctx.input.dayScheduledFor,
      order_weight: ctx.input.weight,
      order_cost: ctx.input.cost,
      order_revenue: ctx.input.revenue,
      custom_user_fields: ctx.input.customFields
    };

    let result = await client.createOrder(body);

    return {
      output: {
        orderId: result.order_id,
        address1: result.address_1,
        dayScheduledFor: result.day_scheduled_for_YYMMDD,
        createdTimestamp: result.created_timestamp
      },
      message: `Created order **${result.order_id}** at "${ctx.input.address1}".`
    };
  })
  .build();

export let getOrders = SlateTool.create(spec, {
  name: 'Get Orders',
  key: 'get_orders',
  description: `Retrieve a single order by ID or list orders. Returns order details including address, customer info, and scheduling.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      orderId: z
        .string()
        .optional()
        .describe('Specific order ID to retrieve. Omit to list all.'),
      limit: z.number().optional().describe('Max number of orders to return'),
      offset: z.number().optional().describe('Pagination offset')
    })
  )
  .output(
    z.object({
      orders: z
        .array(
          z.object({
            orderId: z.number().describe('Order ID'),
            address1: z.string().optional().describe('Street address'),
            addressAlias: z.string().optional().describe('Address alias'),
            firstName: z.string().optional().describe('Customer first name'),
            lastName: z.string().optional().describe('Customer last name'),
            dayScheduledFor: z.string().optional().describe('Scheduled date'),
            lat: z.number().optional().describe('Latitude'),
            lng: z.number().optional().describe('Longitude')
          })
        )
        .describe('List of orders'),
      total: z.number().optional().describe('Total number of orders')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.orderId) {
      let result = await client.getOrder(ctx.input.orderId);
      let order = result.results?.[0] || result;
      return {
        output: {
          orders: [
            {
              orderId: order.order_id,
              address1: order.address_1,
              addressAlias: order.address_alias,
              firstName: order.EXT_FIELD_first_name,
              lastName: order.EXT_FIELD_last_name,
              dayScheduledFor: order.day_scheduled_for_YYMMDD,
              lat: order.cached_lat,
              lng: order.cached_lng
            }
          ],
          total: 1
        },
        message: `Retrieved order **${order.order_id}**.`
      };
    }

    let result = await client.getOrders({ limit: ctx.input.limit, offset: ctx.input.offset });
    let items = result.results || (Array.isArray(result) ? result : []);

    return {
      output: {
        orders: items.map((o: any) => ({
          orderId: o.order_id,
          address1: o.address_1,
          addressAlias: o.address_alias,
          firstName: o.EXT_FIELD_first_name,
          lastName: o.EXT_FIELD_last_name,
          dayScheduledFor: o.day_scheduled_for_YYMMDD,
          lat: o.cached_lat,
          lng: o.cached_lng
        })),
        total: result.total
      },
      message: `Retrieved ${items.length} order(s).`
    };
  })
  .build();

export let updateOrder = SlateTool.create(spec, {
  name: 'Update Order',
  key: 'update_order',
  description: `Update an existing order's properties such as address, customer info, scheduling, or custom fields.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      orderId: z.number().describe('Order ID to update'),
      address1: z.string().optional().describe('New street address'),
      addressAlias: z.string().optional().describe('New address alias'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      email: z.string().optional().describe('Customer email'),
      phone: z.string().optional().describe('Customer phone'),
      dayScheduledFor: z.string().optional().describe('Scheduled date (YYYY-MM-DD)'),
      weight: z.number().optional().describe('Order weight'),
      cost: z.number().optional().describe('Order cost'),
      revenue: z.number().optional().describe('Order revenue')
    })
  )
  .output(
    z.object({
      orderId: z.number().describe('Updated order ID'),
      success: z.boolean().describe('Whether the update succeeded')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let body: Record<string, any> = {
      order_id: ctx.input.orderId
    };
    if (ctx.input.address1) body.address_1 = ctx.input.address1;
    if (ctx.input.addressAlias) body.address_alias = ctx.input.addressAlias;
    if (ctx.input.firstName) body.EXT_FIELD_first_name = ctx.input.firstName;
    if (ctx.input.lastName) body.EXT_FIELD_last_name = ctx.input.lastName;
    if (ctx.input.email) body.EXT_FIELD_email = ctx.input.email;
    if (ctx.input.phone) body.EXT_FIELD_phone = ctx.input.phone;
    if (ctx.input.dayScheduledFor) body.day_scheduled_for_YYMMDD = ctx.input.dayScheduledFor;
    if (ctx.input.weight !== undefined) body.order_weight = ctx.input.weight;
    if (ctx.input.cost !== undefined) body.order_cost = ctx.input.cost;
    if (ctx.input.revenue !== undefined) body.order_revenue = ctx.input.revenue;

    await client.updateOrder(body);

    return {
      output: { orderId: ctx.input.orderId, success: true },
      message: `Updated order **${ctx.input.orderId}**.`
    };
  })
  .build();

export let deleteOrders = SlateTool.create(spec, {
  name: 'Delete Orders',
  key: 'delete_orders',
  description: `Delete one or more orders by their IDs. This action is permanent.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      orderIds: z.array(z.number()).describe('Order IDs to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether deletion succeeded'),
      count: z.number().describe('Number of orders deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteOrder(ctx.input.orderIds);
    return {
      output: { deleted: true, count: ctx.input.orderIds.length },
      message: `Deleted ${ctx.input.orderIds.length} order(s).`
    };
  })
  .build();
