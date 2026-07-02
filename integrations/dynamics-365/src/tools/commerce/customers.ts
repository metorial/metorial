import { commerceCustomerOperationInputSchema } from '@slates/dynamics-commerce-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../../spec';
import {
  buildDocumentedGetCustomerOrderHistoryRequest,
  buildDocumentedGetCustomersByAccountNumbersRequest
} from './retail-server-requests';
import {
  assertPrimitiveAdditionalFields,
  buildCommerceToolOutput,
  commerceMessage,
  commerceResultOutputSchema,
  createCommerceClient,
  requireAnyNonEmptyRecord,
  requireConfirmedWrite,
  requireNonEmptyRecord,
  withCommerceDefaults,
  withCommercePaginationDefaults
} from './shared';

let customerInputSchema = commerceCustomerOperationInputSchema.extend({
  confirmWrite: z
    .boolean()
    .optional()
    .describe('Must be true for create or update actions because they write customer data.'),
  searchLocationValue: z
    .number()
    .int()
    .optional()
    .describe(
      'Required for get_by_account_numbers. Commerce SearchLocation enum value that scopes where customer records are searched.'
    )
});

let writeActions = new Set(['create', 'update']);

export let manageCustomers = SlateTool.create(spec, {
  name: 'Manage Commerce Customers',
  key: 'manage_customers',
  description:
    'Search Dynamics 365 Commerce customers, get customers by account number, inspect customer order history, and conservatively create or update customer records through Retail Server.',
  constraints: [
    'Customer create and update actions require confirmWrite=true.',
    'additionalFields values must be primitive extension-property values.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(customerInputSchema)
  .output(commerceResultOutputSchema)
  .handleInvocation(async ctx => {
    if (writeActions.has(ctx.input.action)) {
      requireConfirmedWrite(ctx.input.confirmWrite, ctx.input.action, 'customers');
      assertPrimitiveAdditionalFields(ctx.input.additionalFields);
    }

    let client = createCommerceClient(ctx);
    let input = withCommerceDefaults(ctx, ctx.input);
    let result: unknown;
    let collection = false;

    switch (input.action) {
      case 'create':
        requireNonEmptyRecord(input.customer, 'customer');
        result = await client.createCustomer(input as any);
        break;
      case 'update':
        requireAnyNonEmptyRecord(
          [input.customer, input.additionalFields],
          'customer or additionalFields'
        );
        result = await client.updateCustomer(input as any);
        break;
      case 'search':
        result = await client.searchCustomers(input);
        collection = true;
        break;
      case 'get_by_account_numbers':
        result = await client.execute(
          buildDocumentedGetCustomersByAccountNumbersRequest(
            withCommercePaginationDefaults(ctx, input)
          )
        );
        collection = true;
        break;
      case 'get_order_history':
        result = await client.execute(
          buildDocumentedGetCustomerOrderHistoryRequest(
            withCommercePaginationDefaults(ctx, input)
          )
        );
        collection = true;
        break;
    }

    let output = buildCommerceToolOutput(input.action, result, {
      collection,
      pageInput: collection ? input : undefined
    });

    return {
      output,
      message: commerceMessage('Commerce customers', input.action, output)
    };
  })
  .build();
