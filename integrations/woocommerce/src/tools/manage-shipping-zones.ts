import { SlateTool } from 'slates';
import { z } from 'zod';
import { woocommerceServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let shippingZoneSchema = z.object({
  zoneId: z.number(),
  name: z.string(),
  order: z.number()
});

let shippingMethodSchema = z.object({
  instanceId: z.number(),
  title: z.string(),
  order: z.number(),
  enabled: z.boolean(),
  methodId: z.string(),
  methodTitle: z.string()
});

let locationSchema = z.object({
  code: z.string(),
  type: z.string()
});

export let manageShippingZones = SlateTool.create(spec, {
  name: 'Manage Shipping Zones',
  key: 'manage_shipping_zones',
  description: `List, create, update, or delete shipping zones. View and add shipping methods within zones, and manage zone locations.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list_zones',
          'get_zone',
          'create_zone',
          'update_zone',
          'delete_zone',
          'list_methods',
          'add_method',
          'list_locations',
          'update_locations'
        ])
        .describe('Operation to perform'),
      zoneId: z
        .number()
        .optional()
        .describe('Shipping zone ID (required for zone-specific actions)'),
      name: z.string().optional().describe('Zone name (for create/update)'),
      order: z.number().optional().describe('Zone sort order'),
      methodId: z
        .string()
        .optional()
        .describe(
          'Shipping method ID (e.g., flat_rate, free_shipping, local_pickup) — for add_method'
        ),
      locations: z
        .array(
          z.object({
            code: z.string().describe('Location code (country code, state code, or postcode)'),
            type: z.enum(['country', 'state', 'postcode']).describe('Location type')
          })
        )
        .optional()
        .describe('Zone locations — for update_locations')
    })
  )
  .output(
    z.object({
      zones: z.array(shippingZoneSchema).optional(),
      zone: shippingZoneSchema.optional(),
      methods: z.array(shippingMethodSchema).optional(),
      method: shippingMethodSchema.optional(),
      locations: z.array(locationSchema).optional(),
      deleted: z.boolean().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let { action, zoneId } = ctx.input;

    if (action === 'list_zones') {
      let zones = await client.listShippingZones();
      let mapped = zones.map((z: any) => ({
        zoneId: z.id,
        name: z.name,
        order: z.order || 0
      }));
      return {
        output: { zones: mapped },
        message: `Found **${mapped.length}** shipping zones.`
      };
    }

    if (action === 'get_zone') {
      if (!zoneId && zoneId !== 0) throw woocommerceServiceError('zoneId is required');
      let zone = await client.getShippingZone(zoneId);
      return {
        output: { zone: { zoneId: zone.id, name: zone.name, order: zone.order || 0 } },
        message: `Retrieved zone **"${zone.name}"**.`
      };
    }

    if (action === 'create_zone') {
      if (!ctx.input.name) throw woocommerceServiceError('name is required for create_zone');
      let data: Record<string, any> = { name: ctx.input.name };
      if (ctx.input.order !== undefined) data.order = ctx.input.order;
      let zone = await client.createShippingZone(data);
      return {
        output: { zone: { zoneId: zone.id, name: zone.name, order: zone.order || 0 } },
        message: `Created zone **"${zone.name}"** (ID: ${zone.id}).`
      };
    }

    if (action === 'update_zone') {
      if (!zoneId && zoneId !== 0) throw woocommerceServiceError('zoneId is required');
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.order !== undefined) data.order = ctx.input.order;
      let zone = await client.updateShippingZone(zoneId, data);
      return {
        output: { zone: { zoneId: zone.id, name: zone.name, order: zone.order || 0 } },
        message: `Updated zone **"${zone.name}"**.`
      };
    }

    if (action === 'delete_zone') {
      if (!zoneId && zoneId !== 0) throw woocommerceServiceError('zoneId is required');
      await client.deleteShippingZone(zoneId);
      return { output: { deleted: true }, message: `Deleted shipping zone (ID: ${zoneId}).` };
    }

    if (action === 'list_methods') {
      if (!zoneId && zoneId !== 0) throw woocommerceServiceError('zoneId is required');
      let methods = await client.listShippingZoneMethods(zoneId);
      let mapped = methods.map((m: any) => ({
        instanceId: m.instance_id,
        title: m.title || '',
        order: m.order || 0,
        enabled: m.enabled || false,
        methodId: m.method_id || '',
        methodTitle: m.method_title || ''
      }));
      return {
        output: { methods: mapped },
        message: `Found **${mapped.length}** methods in zone ${zoneId}.`
      };
    }

    if (action === 'add_method') {
      if (!zoneId && zoneId !== 0) throw woocommerceServiceError('zoneId is required');
      if (!ctx.input.methodId)
        throw woocommerceServiceError('methodId is required for add_method');
      let method = await client.addShippingZoneMethod(zoneId, {
        method_id: ctx.input.methodId
      });
      return {
        output: {
          method: {
            instanceId: method.instance_id,
            title: method.title || '',
            order: method.order || 0,
            enabled: method.enabled || false,
            methodId: method.method_id || '',
            methodTitle: method.method_title || ''
          }
        },
        message: `Added method **"${method.method_title || method.method_id}"** to zone ${zoneId}.`
      };
    }

    if (action === 'list_locations') {
      if (!zoneId && zoneId !== 0) throw woocommerceServiceError('zoneId is required');
      let locations = await client.listShippingZoneLocations(zoneId);
      let mapped = locations.map((l: any) => ({ code: l.code, type: l.type }));
      return {
        output: { locations: mapped },
        message: `Found **${mapped.length}** locations in zone ${zoneId}.`
      };
    }

    if (action === 'update_locations') {
      if (!zoneId && zoneId !== 0) throw woocommerceServiceError('zoneId is required');
      if (!ctx.input.locations)
        throw woocommerceServiceError('locations is required for update_locations');
      let locations = await client.updateShippingZoneLocations(zoneId, ctx.input.locations);
      let mapped = locations.map((l: any) => ({ code: l.code, type: l.type }));
      return {
        output: { locations: mapped },
        message: `Updated locations for zone ${zoneId} (${mapped.length} locations).`
      };
    }

    throw woocommerceServiceError(`Unknown action: ${action}`);
  })
  .build();
