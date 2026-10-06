import { SlateTool } from 'slates';
import { z } from 'zod';
import { scopeInput } from '../lib/contracts';
import { invoke } from '../lib/operations';
import { spec } from '../spec';

const outputSchema = z
  .object({
    clientId: z.number(),
    firstName: z.string().nullable().optional(),
    lastName: z.string().nullable().optional(),
    organization: z.string().nullable().optional(),
    email: z.string().nullable().optional(),
    phone: z.string().nullable().optional(),
    mobilePhone: z.string().nullable().optional(),
    currencyCode: z.string().nullable().optional(),
    language: z.string().nullable().optional(),
    billingStreet: z.string().nullable().optional(),
    billingCity: z.string().nullable().optional(),
    billingProvince: z.string().nullable().optional(),
    billingPostalCode: z.string().nullable().optional(),
    billingCountry: z.string().nullable().optional(),
    outstandingBalance: z.any().optional().describe('Outstanding balance amount')
  })
  .extend({
    raw: z.record(z.string(), z.unknown()).optional(),
    acknowledged: z.boolean().optional(),
    readbackRequired: z.boolean().optional()
  });

export let getClient = SlateTool.create(spec, {
  name: 'Get Client',
  key: 'get_client',
  description: `Retrieve detailed information about a specific client by their ID. Returns full contact details, billing address, and preferences.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      ...scopeInput,
      clientId: z.number().describe('The client ID to retrieve')
    })
  )
  .output(outputSchema)
  .handleInvocation(async ctx => invoke('get_client', ctx, outputSchema))
  .build();
