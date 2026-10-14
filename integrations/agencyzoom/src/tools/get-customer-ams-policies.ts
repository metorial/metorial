import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getCustomerAmsPolicies = SlateTool.create(spec, {
  name: 'Get Customer AMS Policies',
  key: 'get_customer_ams_policies',
  description:
    'Retrieve the policies synchronized from the agency management system for a customer. Returns AgencyZoom policy data and external system identifiers when available. Use search_customers to discover customer IDs.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      customerId: z.string().describe('Customer ID from search_customers or get_customer.')
    })
  )
  .output(
    z.object({
      policies: z.any().describe('The original AMS policy response returned by AgencyZoom.')
    })
  )
  .handleInvocation(async ctx => {
    let policies = await new Client(ctx.auth).getCustomerAmsPolicies(ctx.input.customerId);
    return {
      output: { policies },
      message: `Retrieved AMS policies for customer **${ctx.input.customerId}**.`
    };
  })
  .build();
