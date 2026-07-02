import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let subscriptionContractSchema = z
  .object({
    contractId: z.number().optional().describe('Subscription contract ID'),
    productName: z.string().optional().describe('Product name'),
    variantName: z.string().optional().describe('Variant name'),
    customerName: z.string().optional().describe('Customer name'),
    orderNumber: z.string().optional().describe('Order number'),
    status: z.string().optional().describe('Contract status')
  })
  .passthrough();

export let listSubscriptionContracts = SlateTool.create(spec, {
  name: 'List Subscription Contracts',
  key: 'list_subscription_contracts',
  description: `Retrieve recurring booking subscription contracts. Search by product name, variant name, order number, or customer name.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      searchTerm: z
        .string()
        .optional()
        .describe('Search by product name, variant name, order number, or customer name')
    })
  )
  .output(
    z.object({
      contracts: z.array(subscriptionContractSchema).describe('List of subscription contracts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let result = await client.listSubscriptionContracts({
      searchTerm: ctx.input.searchTerm
    });

    let contracts = Array.isArray(result) ? result : (result?.contracts ?? result?.data ?? []);

    let mapped = contracts.map((c: any) => ({
      contractId: c.id,
      productName: c.product_name,
      variantName: c.variant_name,
      customerName: c.customer_name,
      orderNumber: c.order_number,
      status: c.status,
      ...c
    }));

    return {
      output: { contracts: mapped },
      message: `Retrieved **${mapped.length}** subscription contract(s)${ctx.input.searchTerm ? ` matching "${ctx.input.searchTerm}"` : ''}.`
    };
  })
  .build();
