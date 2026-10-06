import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { fail, id, optionalBoolean, optionalNumber, optionalString } from '../lib/validation';
import { spec } from '../spec';

let carrierSchema = z
  .object({
    carrierId: z.number().nullish().describe('Unique carrier identifier'),
    personalId: z.string().nullish().describe('Internal personal ID'),
    name: z.string().nullish().describe('Full name of the carrier'),
    codeName: z.string().nullish().describe('Code name for the carrier'),
    phoneNumber: z.string().nullish().describe('Phone number in E.164 format'),
    email: z.string().nullish().describe('Email address'),
    companyId: z.number().nullish().describe('Company ID'),
    areaId: z.number().nullish().describe('Operational area ID'),
    isOnShift: z.boolean().nullish().describe('Whether carrier is currently on shift'),
    isActive: z.boolean().nullish().describe('Whether carrier is active'),
    carrierPhoto: z.string().nullish().describe('URL to profile photo'),
    latitude: z.number().nullish().describe('Last known latitude'),
    longitude: z.number().nullish().describe('Last known longitude')
  })
  .passthrough();

export let manageCarriers = SlateTool.create(spec, {
  name: 'Manage Carriers',
  key: 'manage_carriers',
  description: `List, add, or remove carriers (drivers) from your Shipday fleet. Carriers can be assigned to delivery orders for dispatching.`,
  instructions: [
    'Set action to "list" to get all carriers.',
    'Set action to "add" with name, email, and phoneNumber to add a new carrier.',
    'Set action to "delete" with carrierId to remove a carrier.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['list', 'add', 'delete']).describe('Action to perform'),
      name: z.string().optional().describe('Carrier full name (required for add)'),
      email: z.string().optional().describe('Carrier email address (required for add)'),
      phoneNumber: z.string().optional().describe('Carrier phone number (required for add)'),
      carrierId: z.number().optional().describe('Carrier ID (required for delete)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was confirmed'),
      carrierId: z
        .number()
        .optional()
        .describe('Native created carrier ID; generated login passwords are not returned'),
      carriers: z
        .array(carrierSchema)
        .optional()
        .describe('List of carriers (for list action)'),
      count: z.number().optional().describe('Number of carriers (for list action)'),
      responseMessage: z.string().optional().describe('Response message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ShipdayClient({ token: ctx.auth.token });

    if (
      ctx.input.action === 'list' &&
      [ctx.input.name, ctx.input.email, ctx.input.phoneNumber, ctx.input.carrierId].some(
        value => value !== undefined
      )
    )
      fail('Carrier listing does not accept mutation fields.');
    if (
      ctx.input.action === 'delete' &&
      [ctx.input.name, ctx.input.email, ctx.input.phoneNumber].some(
        value => value !== undefined
      )
    )
      fail('Carrier deletion only uses carrierId.');
    if (ctx.input.action === 'add' && ctx.input.carrierId !== undefined)
      fail('Carrier creation does not accept an existing carrierId.');
    if (ctx.input.action === 'list') {
      let carriers = await client.getCarriers();
      let carrierList = carriers;

      let mapped = carrierList.map((c: Record<string, unknown>) => ({
        carrierId: optionalNumber(c.id),
        personalId: optionalString(c.personalId),
        name: optionalString(c.name),
        codeName: optionalString(c.codeName),
        phoneNumber: optionalString(c.phoneNumber),
        email: optionalString(c.email),
        companyId: optionalNumber(c.companyId),
        areaId: optionalNumber(c.areaId),
        isOnShift: optionalBoolean(c.isOnShift),
        isActive: optionalBoolean(c.isActive),
        carrierPhoto: optionalString(c.carrierPhoto),
        latitude: optionalNumber(c.carrrierLocationLat),
        longitude: optionalNumber(c.carrrierLocationLng)
      }));

      return {
        output: {
          success: true,
          carriers: mapped,
          count: mapped.length
        },
        message: `Found **${mapped.length}** carrier(s).`
      };
    }

    if (ctx.input.action === 'add') {
      if (!ctx.input.name || !ctx.input.email || !ctx.input.phoneNumber) {
        fail('name, email, and phoneNumber are required to add a carrier');
      }
      let result = await client.addCarrier({
        name: ctx.input.name,
        email: ctx.input.email,
        phoneNumber: ctx.input.phoneNumber
      });
      return {
        output: {
          success: true,
          responseMessage:
            'Carrier creation confirmed; use Shipday to manage its login credentials.',
          carrierId: id(result.carrierId, 'Created carrier ID')
        },
        message: `Shipday confirmed carrier creation (ID: ${result.carrierId}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.carrierId) {
        fail('carrierId is required to delete a carrier');
      }
      await client.deleteCarrier(ctx.input.carrierId);
      return {
        output: {
          success: true,
          responseMessage: 'Carrier deleted'
        },
        message: `Deleted carrier **${ctx.input.carrierId}**.`
      };
    }

    fail('Unsupported carrier action.');
  })
  .build();
