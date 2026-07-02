import { SlateTool } from 'slates';
import { z } from 'zod';
import { OdpClient } from '../lib/odp-client';
import { spec } from '../spec';

export let manageCustomer = SlateTool.create(spec, {
  name: 'Manage ODP Customer',
  key: 'manage_odp_customer',
  description: `Retrieve or update customer profiles in Optimizely Data Platform (ODP).
Use this to look up customer data by any identifier (email, customer ID, etc.) or upsert profile attributes.
Also supports querying customer segments.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z.enum(['get', 'upsert', 'get_segments']).describe('Action to perform'),
      identifierField: z
        .string()
        .describe('Identifier field name (e.g., "email", "customer_id", "vuid")'),
      identifierValue: z.string().describe('Identifier value to look up'),
      attributes: z
        .record(z.string(), z.any())
        .optional()
        .describe('Profile attributes to set (for upsert)'),
      additionalIdentifiers: z
        .record(z.string(), z.string())
        .optional()
        .describe('Additional identifiers to associate (for upsert)')
    })
  )
  .output(
    z.object({
      customer: z.any().optional().describe('Customer profile data'),
      segments: z.array(z.any()).optional().describe('Customer segments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new OdpClient(ctx.auth.token);

    switch (ctx.input.action) {
      case 'get': {
        let customer = await client.getCustomer(
          ctx.input.identifierField,
          ctx.input.identifierValue
        );
        return {
          output: { customer },
          message: `Retrieved ODP customer profile for ${ctx.input.identifierField}=${ctx.input.identifierValue}.`
        };
      }
      case 'upsert': {
        let identifiers: Record<string, string> = {
          [ctx.input.identifierField]: ctx.input.identifierValue,
          ...ctx.input.additionalIdentifiers
        };
        let customer = await client.upsertCustomer({
          identifiers,
          attributes: ctx.input.attributes
        });
        return {
          output: { customer },
          message: `Upserted ODP customer profile for ${ctx.input.identifierField}=${ctx.input.identifierValue}.`
        };
      }
      case 'get_segments': {
        let segments = await client.getCustomerSegments(
          ctx.input.identifierField,
          ctx.input.identifierValue
        );
        return {
          output: { segments: Array.isArray(segments) ? segments : [] },
          message: `Retrieved segments for ODP customer ${ctx.input.identifierField}=${ctx.input.identifierValue}.`
        };
      }
    }
  })
  .build();
