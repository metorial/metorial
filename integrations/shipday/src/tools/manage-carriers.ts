import { SlateTool } from 'slates';
import { z } from 'zod';
import { ShipdayClient } from '../lib/client';
import { spec } from '../spec';

let carrierSchema = z
  .object({
    carrierId: z.number().optional().describe('Unique carrier identifier'),
    personalId: z.string().optional().describe('Internal personal ID'),
    name: z.string().optional().describe('Full name of the carrier'),
    codeName: z.string().optional().describe('Code name for the carrier'),
    phoneNumber: z.string().optional().describe('Phone number in E.164 format'),
    email: z.string().optional().describe('Email address'),
    companyId: z.number().optional().describe('Company ID'),
    areaId: z.number().optional().describe('Operational area ID'),
    isOnShift: z.boolean().optional().describe('Whether carrier is currently on shift'),
    isActive: z.boolean().optional().describe('Whether carrier is active'),
    carrierPhoto: z.string().optional().describe('URL to profile photo'),
    latitude: z.number().optional().describe('Last known latitude'),
    longitude: z.number().optional().describe('Last known longitude')
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
      success: z.boolean().describe('Whether the operation was successful'),
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

    if (ctx.input.action === 'list') {
      let carriers = await client.getCarriers();
      let carrierList = Array.isArray(carriers) ? carriers : [];

      let mapped = carrierList.map((c: Record<string, unknown>) => ({
        carrierId: c.id as number | undefined,
        personalId: c.personalId as string | undefined,
        name: c.name as string | undefined,
        codeName: c.codeName as string | undefined,
        phoneNumber: c.phoneNumber as string | undefined,
        email: c.email as string | undefined,
        companyId: c.companyId as number | undefined,
        areaId: c.areaId as number | undefined,
        isOnShift: c.isOnShift as boolean | undefined,
        isActive: c.isActive as boolean | undefined,
        carrierPhoto: c.carrierPhoto as string | undefined,
        latitude: c.carrrierLocationLat as number | undefined,
        longitude: c.carrrierLocationLng as number | undefined
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
        throw new Error('name, email, and phoneNumber are required to add a carrier');
      }
      let _result = await client.addCarrier({
        name: ctx.input.name,
        email: ctx.input.email,
        phoneNumber: ctx.input.phoneNumber
      });
      return {
        output: {
          success: true,
          responseMessage: `Carrier added: ${ctx.input.name}`
        },
        message: `Added carrier **${ctx.input.name}** (${ctx.input.email}).`
      };
    }

    if (ctx.input.action === 'delete') {
      if (!ctx.input.carrierId) {
        throw new Error('carrierId is required to delete a carrier');
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

    throw new Error(`Unknown action: ${ctx.input.action}`);
  })
  .build();
