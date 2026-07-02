import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let updateService = SlateTool.create(spec, {
  name: 'Update Service',
  key: 'update_service',
  description: `Update an existing service in eTermin. Provide the service ID and any fields to update. Omitted fields remain unchanged.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      serviceId: z.string().describe('Service ID to update'),
      serviceName: z.string().optional().describe('Updated service name (default language)'),
      serviceNameEn: z.string().optional().describe('Updated service name in English'),
      timeSlotMinutes: z.number().optional().describe('Updated duration in minutes'),
      description: z.string().optional().describe('Updated description'),
      descriptionEn: z.string().optional().describe('Updated description in English'),
      price: z.number().optional().describe('Updated price in cents'),
      vat: z.number().optional().describe('Updated VAT percentage'),
      currency: z.string().optional().describe('Updated currency code'),
      capacity: z.number().optional().describe('Updated maximum capacity'),
      enabled: z.string().optional().describe('"1" to enable, "0" to disable')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('API response with the updated service details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.updateService({
      id: ctx.input.serviceId,
      servicede: ctx.input.serviceName,
      serviceen: ctx.input.serviceNameEn,
      timeslotminutes: ctx.input.timeSlotMinutes,
      descriptionde: ctx.input.description,
      descriptionen: ctx.input.descriptionEn,
      price: ctx.input.price,
      vat: ctx.input.vat,
      currency: ctx.input.currency,
      maxcapacity: ctx.input.capacity,
      enabled: ctx.input.enabled
    });

    return {
      output: { result },
      message: `Service **${ctx.input.serviceId}** updated.`
    };
  })
  .build();
