import { SlateTool } from 'slates';
import { z } from 'zod';
import { TapfiliateClient } from '../lib/client';
import { spec } from '../spec';

let customerSchema = z.object({
  customerId: z.string().describe('Unique identifier of the customer'),
  status: z
    .string()
    .optional()
    .describe('Customer status (trial, lead, new, paying, canceled)'),
  click: z.any().optional().describe('Click that referred this customer'),
  program: z.any().optional().describe('Program the customer belongs to'),
  affiliate: z.any().optional().describe('Affiliate who referred this customer'),
  metaData: z.record(z.string(), z.any()).optional().describe('Custom metadata'),
  createdAt: z.string().optional().describe('Creation timestamp')
});

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new referred customer in Tapfiliate. Customers are tracked for recurring/lifetime commission attribution — each subsequent conversion for the customer will be attributed to the original referring affiliate.`,
  instructions: [
    'At least one attribution method must be provided: referralCode, coupon, clickId, trackingId, or assetId+sourceId.',
    'Useful for SaaS and subscription businesses implementing recurring commissions.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z
        .string()
        .describe('Your unique customer identifier (e.g., user ID from your system)'),
      referralCode: z.string().optional().describe('Affiliate referral code for attribution'),
      trackingId: z.string().optional().describe('Tracking ID for attribution'),
      clickId: z.string().optional().describe('Click ID for attribution'),
      coupon: z.string().optional().describe('Coupon code for attribution'),
      assetId: z.string().optional().describe('Asset ID for asset/source attribution'),
      sourceId: z.string().optional().describe('Source ID for asset/source attribution'),
      status: z
        .enum(['trial', 'lead', 'new', 'paying'])
        .optional()
        .describe('Initial customer status'),
      userAgent: z
        .string()
        .optional()
        .describe('User agent string (for REST-only integrations)'),
      ip: z.string().optional().describe('IP address (for REST-only integrations)'),
      metaData: z
        .record(z.string(), z.string())
        .optional()
        .describe('Custom key-value metadata'),
      overrideMaxCookieTime: z
        .boolean()
        .optional()
        .describe('Override max cookie time for attribution')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.createCustomer(ctx.input);

    return {
      output: {
        customerId: result.customer_id || result.id,
        status: result.status,
        click: result.click,
        program: result.program,
        affiliate: result.affiliate,
        metaData: result.meta_data,
        createdAt: result.created_at
      },
      message: `Created customer \`${result.customer_id || result.id}\` with status "${result.status || 'new'}".`
    };
  })
  .build();

export let getCustomer = SlateTool.create(spec, {
  name: 'Get Customer',
  key: 'get_customer',
  description: `Retrieve detailed information about a specific customer, including their status, referring affiliate, program, and metadata.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to retrieve')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result = await client.getCustomer(ctx.input.customerId);

    return {
      output: {
        customerId: result.customer_id || result.id,
        status: result.status,
        click: result.click,
        program: result.program,
        affiliate: result.affiliate,
        metaData: result.meta_data,
        createdAt: result.created_at
      },
      message: `Retrieved customer \`${result.customer_id || result.id}\` (status: ${result.status}).`
    };
  })
  .build();

export let listCustomers = SlateTool.create(spec, {
  name: 'List Customers',
  key: 'list_customers',
  description: `List referred customers with optional filters by program, customer ID, affiliate, and date range. Results are paginated (25 per page).`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      programId: z.string().optional().describe('Filter by program ID'),
      customerId: z.string().optional().describe('Filter by customer ID'),
      affiliateId: z.string().optional().describe('Filter by referring affiliate ID'),
      dateFrom: z.string().optional().describe('Filter from date (YYYY-MM-DD)'),
      dateTo: z.string().optional().describe('Filter to date (YYYY-MM-DD)'),
      page: z.number().optional().describe('Page number for pagination')
    })
  )
  .output(
    z.object({
      customers: z.array(customerSchema).describe('List of customers')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let results = await client.listCustomers(ctx.input);

    let customers = results.map((r: any) => ({
      customerId: r.customer_id || r.id,
      status: r.status,
      click: r.click,
      program: r.program,
      affiliate: r.affiliate,
      metaData: r.meta_data,
      createdAt: r.created_at
    }));

    return {
      output: { customers },
      message: `Found **${customers.length}** customer(s).`
    };
  })
  .build();

export let updateCustomerStatus = SlateTool.create(spec, {
  name: 'Update Customer Status',
  key: 'update_customer_status',
  description: `Cancel or uncancel a customer. Canceling a customer stops future commission generation for that customer. Uncanceling restores them to their appropriate status.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer'),
      action: z
        .enum(['cancel', 'uncancel'])
        .describe('Whether to cancel or uncancel the customer')
    })
  )
  .output(customerSchema)
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    let result: any;

    if (ctx.input.action === 'cancel') {
      result = await client.cancelCustomer(ctx.input.customerId);
    } else {
      result = await client.uncancelCustomer(ctx.input.customerId);
    }

    return {
      output: {
        customerId: result.customer_id || result.id,
        status: result.status,
        click: result.click,
        program: result.program,
        affiliate: result.affiliate,
        metaData: result.meta_data,
        createdAt: result.created_at
      },
      message: `${ctx.input.action === 'cancel' ? 'Canceled' : 'Uncanceled'} customer \`${result.customer_id || result.id}\`.`
    };
  })
  .build();

export let deleteCustomer = SlateTool.create(spec, {
  name: 'Delete Customer',
  key: 'delete_customer',
  description: `Permanently delete a customer record from Tapfiliate. This action cannot be undone.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      customerId: z.string().describe('ID of the customer to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the deletion was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TapfiliateClient({ token: ctx.auth.token });
    await client.deleteCustomer(ctx.input.customerId);

    return {
      output: { deleted: true },
      message: `Deleted customer \`${ctx.input.customerId}\`.`
    };
  })
  .build();
