import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createService = SlateTool.create(spec, {
  name: 'Create Service',
  key: 'create_service',
  description: `Create a new bookable service in eTermin. Requires a service group ID, service name, and time slot duration. Optionally configure pricing, capacity, and descriptions.`,
  instructions: [
    'Price values are in cents (multiply by 100, e.g. 25.00 EUR = 2500).',
    'The service name uses the "servicede" parameter by default (German). Use language-specific parameters like "serviceen" for English.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      serviceGroupId: z.string().describe('Service group ID to assign this service to'),
      serviceName: z.string().describe('Service name (default language)'),
      serviceNameEn: z.string().optional().describe('Service name in English'),
      timeSlotMinutes: z.number().describe('Duration in minutes for the service time slot'),
      description: z.string().optional().describe('Service description (default language)'),
      descriptionEn: z.string().optional().describe('Service description in English'),
      price: z.number().optional().describe('Price in cents (e.g. 2500 for 25.00)'),
      vat: z.number().optional().describe('VAT percentage (e.g. 19 for 19%)'),
      currency: z.string().optional().describe('Currency code (e.g. EUR, USD, CHF)'),
      capacity: z.number().optional().describe('Maximum capacity for the service')
    })
  )
  .output(
    z.object({
      result: z
        .record(z.string(), z.any())
        .describe('API response with the created service details')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicKey: ctx.auth.publicKey,
      privateKey: ctx.auth.privateKey
    });

    let result = await client.createService({
      servicegroupid: ctx.input.serviceGroupId,
      servicede: ctx.input.serviceName,
      serviceen: ctx.input.serviceNameEn,
      timeslotminutes: ctx.input.timeSlotMinutes,
      descriptionde: ctx.input.description,
      descriptionen: ctx.input.descriptionEn,
      price: ctx.input.price,
      vat: ctx.input.vat,
      currency: ctx.input.currency,
      maxcapacity: ctx.input.capacity
    });

    return {
      output: { result },
      message: `Service **${ctx.input.serviceName}** created (${ctx.input.timeSlotMinutes} min).`
    };
  })
  .build();
