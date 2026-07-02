import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageService = SlateTool.create(spec, {
  name: 'Manage Service',
  key: 'manage_service',
  description: `Create, update, list, or get services. Services define offerings like appointments, classes, or add-ons with name, description, pricing, duration, staff assignments, and booking configuration.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['create', 'update', 'get', 'list']).describe('Action to perform'),
      serviceId: z.string().optional().describe('Service ID (required for get and update)'),
      name: z.string().optional().describe('Service name'),
      description: z.string().optional().describe('Service description'),
      serviceType: z
        .enum(['APPOINTMENT', 'CLASS', 'ADD_ON'])
        .optional()
        .describe('Type of service'),
      sellingPrice: z.number().optional().describe('Selling price'),
      currency: z.string().optional().describe('Currency code'),
      durationMinutes: z.number().optional().describe('Duration in minutes'),
      categoryId: z.string().optional().describe('Service category ID'),
      staffIds: z.array(z.string()).optional().describe('Assigned staff member IDs'),
      enableOnlineBooking: z.boolean().optional().describe('Enable online booking'),
      enableOnlinePayment: z.boolean().optional().describe('Accept online payments'),
      numberOfParticipants: z
        .number()
        .optional()
        .describe('Max participants (for CLASS type)'),
      page: z.number().optional().describe('Page number (for list)'),
      pageSize: z.number().optional().describe('Results per page (for list)')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation succeeded'),
      service: z.record(z.string(), z.any()).optional().describe('Service record'),
      services: z.array(z.record(z.string(), z.any())).optional().describe('List of services')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiHost: ctx.config.apiHost
    });

    let { action } = ctx.input;

    if (action === 'create') {
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.serviceType) data.serviceType = ctx.input.serviceType;
      if (ctx.input.sellingPrice !== undefined) data.sellingPrice = ctx.input.sellingPrice;
      if (ctx.input.currency) data.currency = ctx.input.currency;
      if (ctx.input.durationMinutes !== undefined)
        data.durationMinutes = ctx.input.durationMinutes;
      if (ctx.input.categoryId) data.categoryId = ctx.input.categoryId;
      if (ctx.input.staffIds) data.staffIds = ctx.input.staffIds;
      if (ctx.input.enableOnlineBooking !== undefined)
        data.enableOnlineBooking = ctx.input.enableOnlineBooking;
      if (ctx.input.enableOnlinePayment !== undefined)
        data.enableOnlinePayment = ctx.input.enableOnlinePayment;
      if (ctx.input.numberOfParticipants !== undefined)
        data.numberOfParticipants = ctx.input.numberOfParticipants;

      let result = await client.createService(data);
      return {
        output: { success: true, service: result },
        message: `Created service **${ctx.input.name}**.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.serviceId) throw new Error('serviceId is required for update');
      let data: Record<string, any> = {};
      if (ctx.input.name) data.name = ctx.input.name;
      if (ctx.input.description) data.description = ctx.input.description;
      if (ctx.input.serviceType) data.serviceType = ctx.input.serviceType;
      if (ctx.input.sellingPrice !== undefined) data.sellingPrice = ctx.input.sellingPrice;
      if (ctx.input.currency) data.currency = ctx.input.currency;
      if (ctx.input.durationMinutes !== undefined)
        data.durationMinutes = ctx.input.durationMinutes;
      if (ctx.input.categoryId) data.categoryId = ctx.input.categoryId;
      if (ctx.input.staffIds) data.staffIds = ctx.input.staffIds;
      if (ctx.input.enableOnlineBooking !== undefined)
        data.enableOnlineBooking = ctx.input.enableOnlineBooking;
      if (ctx.input.enableOnlinePayment !== undefined)
        data.enableOnlinePayment = ctx.input.enableOnlinePayment;
      if (ctx.input.numberOfParticipants !== undefined)
        data.numberOfParticipants = ctx.input.numberOfParticipants;

      let result = await client.updateService(ctx.input.serviceId, data);
      return {
        output: { success: true, service: result },
        message: `Updated service **${ctx.input.serviceId}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.serviceId) throw new Error('serviceId is required for get');
      let result = await client.getService(ctx.input.serviceId);
      return {
        output: { success: true, service: result },
        message: `Retrieved service **${result.name || ctx.input.serviceId}**.`
      };
    }

    if (action === 'list') {
      let result = await client.listServices({
        page: ctx.input.page,
        pageSize: ctx.input.pageSize
      });
      let services = Array.isArray(result) ? result : result.services || result.data || [];
      return {
        output: { success: true, services },
        message: `Found **${services.length}** service(s).`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
