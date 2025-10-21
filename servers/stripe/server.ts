import { metorial, ResourceTemplate, z } from '@metorial/mcp-server-sdk';

/**
 * Stripe MCP Server
 * Provides tools and resources for interacting with the Stripe API
 */

metorial.createServer<{ token: string }>(
  {
    name: 'stripe-mcp-server',
    version: '1.0.0'
  },
  async (server, config) => {
    const STRIPE_API_BASE = 'https://api.stripe.com/v1';

    /**
     * Helper function to make authenticated requests to Stripe API
     */
    async function stripeRequest(
      endpoint: string,
      method: string = 'GET',
      body?: Record<string, any>
    ): Promise<any> {
      const headers: Record<string, string> = {
        Authorization: `Bearer ${config.token}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      };

      const options: RequestInit = {
        method,
        headers
      };

      if (body && (method === 'POST' || method === 'DELETE')) {
        // Convert body to x-www-form-urlencoded format
        const formBody = new URLSearchParams();
        Object.entries(body).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (typeof value === 'object' && !Array.isArray(value)) {
              // Handle nested objects (like metadata)
              Object.entries(value).forEach(([nestedKey, nestedValue]) => {
                formBody.append(`${key}[${nestedKey}]`, String(nestedValue));
              });
            } else if (Array.isArray(value)) {
              value.forEach((item, index) => {
                if (typeof item === 'object') {
                  Object.entries(item).forEach(([nestedKey, nestedValue]) => {
                    formBody.append(`${key}[${index}][${nestedKey}]`, String(nestedValue));
                  });
                } else {
                  formBody.append(`${key}[]`, String(item));
                }
              });
            } else {
              formBody.append(key, String(value));
            }
          }
        });
        options.body = formBody.toString();
      }

      const url =
        method === 'GET' && body
          ? `${STRIPE_API_BASE}${endpoint}?${new URLSearchParams(body as any).toString()}`
          : `${STRIPE_API_BASE}${endpoint}`;

      const response = await fetch(url, options);
      const data = (await response.json()) as any;

      if (!response.ok) {
        throw new Error(`Stripe API Error: ${data.error?.message || JSON.stringify(data)}`);
      }

      return data;
    }

    // ============================================================================
    // RESOURCES
    // ============================================================================

    /**
     * Customer Resource
     */
    server.registerResource(
      'customer',
      new ResourceTemplate('stripe://customers/{customer_id}', { list: undefined }),
      {
        title: 'Stripe Customer',
        description: 'Access detailed information about a specific Stripe customer'
      },
      async (uri, { customer_id }) => {
        const customer = await stripeRequest(`/customers/${customer_id}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(customer, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Payment Intent Resource
     */
    server.registerResource(
      'payment_intent',
      new ResourceTemplate('stripe://payment-intents/{payment_intent_id}', {
        list: undefined
      }),
      {
        title: 'Stripe Payment Intent',
        description: 'Access detailed information about a specific payment intent'
      },
      async (uri, { payment_intent_id }) => {
        const paymentIntent = await stripeRequest(`/payment_intents/${payment_intent_id}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(paymentIntent, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Charge Resource
     */
    server.registerResource(
      'charge',
      new ResourceTemplate('stripe://charges/{charge_id}', { list: undefined }),
      {
        title: 'Stripe Charge',
        description: 'Access detailed information about a specific charge'
      },
      async (uri, { charge_id }) => {
        const charge = await stripeRequest(`/charges/${charge_id}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(charge, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Subscription Resource
     */
    server.registerResource(
      'subscription',
      new ResourceTemplate('stripe://subscriptions/{subscription_id}', { list: undefined }),
      {
        title: 'Stripe Subscription',
        description: 'Access detailed information about a specific subscription'
      },
      async (uri, { subscription_id }) => {
        const subscription = await stripeRequest(`/subscriptions/${subscription_id}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(subscription, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Invoice Resource
     */
    server.registerResource(
      'invoice',
      new ResourceTemplate('stripe://invoices/{invoice_id}', { list: undefined }),
      {
        title: 'Stripe Invoice',
        description: 'Access detailed information about a specific invoice'
      },
      async (uri, { invoice_id }) => {
        const invoice = await stripeRequest(`/invoices/${invoice_id}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(invoice, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Product Resource
     */
    server.registerResource(
      'product',
      new ResourceTemplate('stripe://products/{product_id}', { list: undefined }),
      {
        title: 'Stripe Product',
        description: 'Access detailed information about a specific product'
      },
      async (uri, { product_id }) => {
        const product = await stripeRequest(`/products/${product_id}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(product, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Price Resource
     */
    server.registerResource(
      'price',
      new ResourceTemplate('stripe://prices/{price_id}', { list: undefined }),
      {
        title: 'Stripe Price',
        description: 'Access detailed information about a specific price'
      },
      async (uri, { price_id }) => {
        const price = await stripeRequest(`/prices/${price_id}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(price, null, 2)
            }
          ]
        };
      }
    );

    /**
     * Refund Resource
     */
    server.registerResource(
      'refund',
      new ResourceTemplate('stripe://refunds/{refund_id}', { list: undefined }),
      {
        title: 'Stripe Refund',
        description: 'Access detailed information about a specific refund'
      },
      async (uri, { refund_id }) => {
        const refund = await stripeRequest(`/refunds/${refund_id}`);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'application/json',
              text: JSON.stringify(refund, null, 2)
            }
          ]
        };
      }
    );

    // ============================================================================
    // CUSTOMER MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'list_customers',
      {
        title: 'List Customers',
        description: 'List all Stripe customers with optional filters',
        inputSchema: {
          email: z.string().optional().describe('Filter by customer email'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of customers to return (1-100)'),
          starting_after: z.string().optional().describe('Customer ID for pagination')
        }
      },
      async ({ email, limit, starting_after }) => {
        const params: Record<string, any> = { limit };
        if (email) params.email = email;
        if (starting_after) params.starting_after = starting_after;

        const result = await stripeRequest('/customers', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_customer',
      {
        title: 'Create Customer',
        description: 'Create a new Stripe customer',
        inputSchema: {
          email: z.string().optional().describe('Customer email address'),
          name: z.string().optional().describe('Customer name'),
          description: z.string().optional().describe('Customer description'),
          phone: z.string().optional().describe('Customer phone number'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ email, name, description, phone, metadata }) => {
        const body: Record<string, any> = {};
        if (email) body.email = email;
        if (name) body.name = name;
        if (description) body.description = description;
        if (phone) body.phone = phone;
        if (metadata) body.metadata = metadata;

        const customer = await stripeRequest('/customers', 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Customer created successfully: ${customer.id}\n\n${JSON.stringify(
                customer,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'update_customer',
      {
        title: 'Update Customer',
        description: 'Update an existing Stripe customer',
        inputSchema: {
          customer_id: z.string().describe('The ID of the customer to update'),
          email: z.string().optional().describe('Customer email address'),
          name: z.string().optional().describe('Customer name'),
          description: z.string().optional().describe('Customer description'),
          phone: z.string().optional().describe('Customer phone number'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ customer_id, email, name, description, phone, metadata }) => {
        const body: Record<string, any> = {};
        if (email) body.email = email;
        if (name) body.name = name;
        if (description) body.description = description;
        if (phone) body.phone = phone;
        if (metadata) body.metadata = metadata;

        const customer = await stripeRequest(`/customers/${customer_id}`, 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Customer updated successfully\n\n${JSON.stringify(customer, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_customer',
      {
        title: 'Delete Customer',
        description: 'Delete a Stripe customer',
        inputSchema: {
          customer_id: z.string().describe('The ID of the customer to delete')
        }
      },
      async ({ customer_id }) => {
        const result = await stripeRequest(`/customers/${customer_id}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: `Customer deleted successfully: ${customer_id}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // PAYMENT INTENT MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'list_payment_intents',
      {
        title: 'List Payment Intents',
        description: 'List payment intents with optional filters',
        inputSchema: {
          customer: z.string().optional().describe('Filter by customer ID'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of payment intents to return (1-100)'),
          starting_after: z.string().optional().describe('Payment intent ID for pagination')
        }
      },
      async ({ customer, limit, starting_after }) => {
        const params: Record<string, any> = { limit };
        if (customer) params.customer = customer;
        if (starting_after) params.starting_after = starting_after;

        const result = await stripeRequest('/payment_intents', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_payment_intent',
      {
        title: 'Create Payment Intent',
        description: 'Create a new payment intent',
        inputSchema: {
          amount: z.number().describe('Amount in cents (e.g., 1000 for $10.00)'),
          currency: z.string().describe('Three-letter ISO currency code (e.g., usd, eur)'),
          customer: z.string().optional().describe('Customer ID'),
          description: z.string().optional().describe('Description of the payment'),
          payment_method: z.string().optional().describe('Payment method ID'),
          confirm: z.boolean().optional().describe('Automatically confirm the payment intent'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({
        amount,
        currency,
        customer,
        description,
        payment_method,
        confirm,
        metadata
      }) => {
        const body: Record<string, any> = { amount, currency };
        if (customer) body.customer = customer;
        if (description) body.description = description;
        if (payment_method) body.payment_method = payment_method;
        if (confirm !== undefined) body.confirm = confirm;
        if (metadata) body.metadata = metadata;

        const paymentIntent = await stripeRequest('/payment_intents', 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Payment intent created successfully: ${
                paymentIntent.id
              }\n\n${JSON.stringify(paymentIntent, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'update_payment_intent',
      {
        title: 'Update Payment Intent',
        description: 'Update an existing payment intent',
        inputSchema: {
          payment_intent_id: z.string().describe('The ID of the payment intent to update'),
          amount: z.number().optional().describe('Amount in cents'),
          currency: z.string().optional().describe('Three-letter ISO currency code'),
          customer: z.string().optional().describe('Customer ID'),
          description: z.string().optional().describe('Description of the payment'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ payment_intent_id, amount, currency, customer, description, metadata }) => {
        const body: Record<string, any> = {};
        if (amount) body.amount = amount;
        if (currency) body.currency = currency;
        if (customer) body.customer = customer;
        if (description) body.description = description;
        if (metadata) body.metadata = metadata;

        const paymentIntent = await stripeRequest(
          `/payment_intents/${payment_intent_id}`,
          'POST',
          body
        );
        return {
          content: [
            {
              type: 'text',
              text: `Payment intent updated successfully\n\n${JSON.stringify(
                paymentIntent,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'confirm_payment_intent',
      {
        title: 'Confirm Payment Intent',
        description: 'Confirm a payment intent',
        inputSchema: {
          payment_intent_id: z.string().describe('The ID of the payment intent to confirm'),
          payment_method: z.string().optional().describe('Payment method ID')
        }
      },
      async ({ payment_intent_id, payment_method }) => {
        const body: Record<string, any> = {};
        if (payment_method) body.payment_method = payment_method;

        const paymentIntent = await stripeRequest(
          `/payment_intents/${payment_intent_id}/confirm`,
          'POST',
          body
        );
        return {
          content: [
            {
              type: 'text',
              text: `Payment intent confirmed\n\n${JSON.stringify(paymentIntent, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'cancel_payment_intent',
      {
        title: 'Cancel Payment Intent',
        description: 'Cancel a payment intent',
        inputSchema: {
          payment_intent_id: z.string().describe('The ID of the payment intent to cancel')
        }
      },
      async ({ payment_intent_id }) => {
        const paymentIntent = await stripeRequest(
          `/payment_intents/${payment_intent_id}/cancel`,
          'POST'
        );
        return {
          content: [
            {
              type: 'text',
              text: `Payment intent cancelled\n\n${JSON.stringify(paymentIntent, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'capture_payment_intent',
      {
        title: 'Capture Payment Intent',
        description: 'Capture a payment intent that was created with capture_method=manual',
        inputSchema: {
          payment_intent_id: z.string().describe('The ID of the payment intent to capture'),
          amount_to_capture: z
            .number()
            .optional()
            .describe('Amount to capture in cents (defaults to full amount)')
        }
      },
      async ({ payment_intent_id, amount_to_capture }) => {
        const body: Record<string, any> = {};
        if (amount_to_capture) body.amount_to_capture = amount_to_capture;

        const paymentIntent = await stripeRequest(
          `/payment_intents/${payment_intent_id}/capture`,
          'POST',
          body
        );
        return {
          content: [
            {
              type: 'text',
              text: `Payment intent captured\n\n${JSON.stringify(paymentIntent, null, 2)}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // CHARGE MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'list_charges',
      {
        title: 'List Charges',
        description: 'List charges with optional filters',
        inputSchema: {
          customer: z.string().optional().describe('Filter by customer ID'),
          payment_intent: z.string().optional().describe('Filter by payment intent ID'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of charges to return (1-100)'),
          starting_after: z.string().optional().describe('Charge ID for pagination')
        }
      },
      async ({ customer, payment_intent, limit, starting_after }) => {
        const params: Record<string, any> = { limit };
        if (customer) params.customer = customer;
        if (payment_intent) params.payment_intent = payment_intent;
        if (starting_after) params.starting_after = starting_after;

        const result = await stripeRequest('/charges', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_charge',
      {
        title: 'Create Charge',
        description:
          'Create a direct charge (legacy API, prefer Payment Intents for new integrations)',
        inputSchema: {
          amount: z.number().describe('Amount in cents (e.g., 1000 for $10.00)'),
          currency: z.string().describe('Three-letter ISO currency code (e.g., usd, eur)'),
          customer: z.string().optional().describe('Customer ID'),
          source: z.string().optional().describe('Payment source (token or card ID)'),
          description: z.string().optional().describe('Description of the charge'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ amount, currency, customer, source, description, metadata }) => {
        const body: Record<string, any> = { amount, currency };
        if (customer) body.customer = customer;
        if (source) body.source = source;
        if (description) body.description = description;
        if (metadata) body.metadata = metadata;

        const charge = await stripeRequest('/charges', 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Charge created successfully: ${charge.id}\n\n${JSON.stringify(
                charge,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // SUBSCRIPTION MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'list_subscriptions',
      {
        title: 'List Subscriptions',
        description: 'List subscriptions with optional filters',
        inputSchema: {
          customer: z.string().optional().describe('Filter by customer ID'),
          price: z.string().optional().describe('Filter by price ID'),
          status: z
            .enum([
              'active',
              'past_due',
              'unpaid',
              'canceled',
              'incomplete',
              'incomplete_expired',
              'trialing',
              'all'
            ])
            .optional()
            .describe('Filter by subscription status'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of subscriptions to return (1-100)'),
          starting_after: z.string().optional().describe('Subscription ID for pagination')
        }
      },
      async ({ customer, price, status, limit, starting_after }) => {
        const params: Record<string, any> = { limit };
        if (customer) params.customer = customer;
        if (price) params.price = price;
        if (status) params.status = status;
        if (starting_after) params.starting_after = starting_after;

        const result = await stripeRequest('/subscriptions', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_subscription',
      {
        title: 'Create Subscription',
        description: 'Create a new subscription for a customer',
        inputSchema: {
          customer: z.string().describe('Customer ID'),
          items: z
            .array(
              z.object({
                price: z.string().describe('Price ID'),
                quantity: z.number().optional().describe('Quantity (defaults to 1)')
              })
            )
            .describe('List of subscription items with price IDs'),
          trial_period_days: z.number().optional().describe('Number of trial days'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ customer, items, trial_period_days, metadata }) => {
        const body: Record<string, any> = { customer, items };
        if (trial_period_days) body.trial_period_days = trial_period_days;
        if (metadata) body.metadata = metadata;

        const subscription = await stripeRequest('/subscriptions', 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Subscription created successfully: ${subscription.id}\n\n${JSON.stringify(
                subscription,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'update_subscription',
      {
        title: 'Update Subscription',
        description: 'Update an existing subscription',
        inputSchema: {
          subscription_id: z.string().describe('The ID of the subscription to update'),
          items: z
            .array(
              z.object({
                id: z
                  .string()
                  .optional()
                  .describe('Subscription item ID (for existing items)'),
                price: z.string().describe('Price ID'),
                quantity: z.number().optional().describe('Quantity')
              })
            )
            .optional()
            .describe('Update subscription items'),
          proration_behavior: z
            .enum(['create_prorations', 'none', 'always_invoice'])
            .optional()
            .describe('Proration behavior'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ subscription_id, items, proration_behavior, metadata }) => {
        const body: Record<string, any> = {};
        if (items) body.items = items;
        if (proration_behavior) body.proration_behavior = proration_behavior;
        if (metadata) body.metadata = metadata;

        const subscription = await stripeRequest(
          `/subscriptions/${subscription_id}`,
          'POST',
          body
        );
        return {
          content: [
            {
              type: 'text',
              text: `Subscription updated successfully\n\n${JSON.stringify(
                subscription,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'cancel_subscription',
      {
        title: 'Cancel Subscription',
        description: 'Cancel a subscription',
        inputSchema: {
          subscription_id: z.string().describe('The ID of the subscription to cancel'),
          invoice_now: z.boolean().optional().describe('Create an invoice immediately'),
          prorate: z.boolean().optional().describe('Prorate the cancellation')
        }
      },
      async ({ subscription_id, invoice_now, prorate }) => {
        const body: Record<string, any> = {};
        if (invoice_now !== undefined) body.invoice_now = invoice_now;
        if (prorate !== undefined) body.prorate = prorate;

        const subscription = await stripeRequest(
          `/subscriptions/${subscription_id}`,
          'DELETE',
          body
        );
        return {
          content: [
            {
              type: 'text',
              text: `Subscription cancelled successfully\n\n${JSON.stringify(
                subscription,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'resume_subscription',
      {
        title: 'Resume Subscription',
        description: 'Resume a paused subscription',
        inputSchema: {
          subscription_id: z.string().describe('The ID of the subscription to resume')
        }
      },
      async ({ subscription_id }) => {
        const body = {
          pause_collection: ''
        };

        const subscription = await stripeRequest(
          `/subscriptions/${subscription_id}`,
          'POST',
          body
        );
        return {
          content: [
            {
              type: 'text',
              text: `Subscription resumed successfully\n\n${JSON.stringify(
                subscription,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // INVOICE MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'list_invoices',
      {
        title: 'List Invoices',
        description: 'List invoices with optional filters',
        inputSchema: {
          customer: z.string().optional().describe('Filter by customer ID'),
          subscription: z.string().optional().describe('Filter by subscription ID'),
          status: z
            .enum(['draft', 'open', 'paid', 'uncollectible', 'void'])
            .optional()
            .describe('Filter by invoice status'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of invoices to return (1-100)'),
          starting_after: z.string().optional().describe('Invoice ID for pagination')
        }
      },
      async ({ customer, subscription, status, limit, starting_after }) => {
        const params: Record<string, any> = { limit };
        if (customer) params.customer = customer;
        if (subscription) params.subscription = subscription;
        if (status) params.status = status;
        if (starting_after) params.starting_after = starting_after;

        const result = await stripeRequest('/invoices', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_invoice',
      {
        title: 'Create Invoice',
        description: 'Create a new invoice for a customer',
        inputSchema: {
          customer: z.string().describe('Customer ID'),
          description: z.string().optional().describe('Invoice description'),
          auto_advance: z.boolean().optional().describe('Auto-finalize invoice after 1 hour'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ customer, description, auto_advance, metadata }) => {
        const body: Record<string, any> = { customer };
        if (description) body.description = description;
        if (auto_advance !== undefined) body.auto_advance = auto_advance;
        if (metadata) body.metadata = metadata;

        const invoice = await stripeRequest('/invoices', 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Invoice created successfully: ${invoice.id}\n\n${JSON.stringify(
                invoice,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'finalize_invoice',
      {
        title: 'Finalize Invoice',
        description: 'Finalize a draft invoice',
        inputSchema: {
          invoice_id: z.string().describe('The ID of the invoice to finalize')
        }
      },
      async ({ invoice_id }) => {
        const invoice = await stripeRequest(`/invoices/${invoice_id}/finalize`, 'POST');
        return {
          content: [
            {
              type: 'text',
              text: `Invoice finalized successfully\n\n${JSON.stringify(invoice, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'pay_invoice',
      {
        title: 'Pay Invoice',
        description: 'Pay an invoice',
        inputSchema: {
          invoice_id: z.string().describe('The ID of the invoice to pay')
        }
      },
      async ({ invoice_id }) => {
        const invoice = await stripeRequest(`/invoices/${invoice_id}/pay`, 'POST');
        return {
          content: [
            {
              type: 'text',
              text: `Invoice paid successfully\n\n${JSON.stringify(invoice, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'void_invoice',
      {
        title: 'Void Invoice',
        description: 'Void an invoice',
        inputSchema: {
          invoice_id: z.string().describe('The ID of the invoice to void')
        }
      },
      async ({ invoice_id }) => {
        const invoice = await stripeRequest(`/invoices/${invoice_id}/void`, 'POST');
        return {
          content: [
            {
              type: 'text',
              text: `Invoice voided successfully\n\n${JSON.stringify(invoice, null, 2)}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // PRODUCT & PRICE MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'list_products',
      {
        title: 'List Products',
        description: 'List products with optional filters',
        inputSchema: {
          active: z.boolean().optional().describe('Filter by active status'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of products to return (1-100)'),
          starting_after: z.string().optional().describe('Product ID for pagination')
        }
      },
      async ({ active, limit, starting_after }) => {
        const params: Record<string, any> = { limit };
        if (active !== undefined) params.active = active;
        if (starting_after) params.starting_after = starting_after;

        const result = await stripeRequest('/products', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_product',
      {
        title: 'Create Product',
        description: 'Create a new product',
        inputSchema: {
          name: z.string().describe('Product name'),
          description: z.string().optional().describe('Product description'),
          active: z.boolean().optional().describe('Whether the product is active'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ name, description, active, metadata }) => {
        const body: Record<string, any> = { name };
        if (description) body.description = description;
        if (active !== undefined) body.active = active;
        if (metadata) body.metadata = metadata;

        const product = await stripeRequest('/products', 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Product created successfully: ${product.id}\n\n${JSON.stringify(
                product,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'update_product',
      {
        title: 'Update Product',
        description: 'Update an existing product',
        inputSchema: {
          product_id: z.string().describe('The ID of the product to update'),
          name: z.string().optional().describe('Product name'),
          description: z.string().optional().describe('Product description'),
          active: z.boolean().optional().describe('Whether the product is active'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ product_id, name, description, active, metadata }) => {
        const body: Record<string, any> = {};
        if (name) body.name = name;
        if (description) body.description = description;
        if (active !== undefined) body.active = active;
        if (metadata) body.metadata = metadata;

        const product = await stripeRequest(`/products/${product_id}`, 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Product updated successfully\n\n${JSON.stringify(product, null, 2)}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'delete_product',
      {
        title: 'Delete Product',
        description: 'Delete a product',
        inputSchema: {
          product_id: z.string().describe('The ID of the product to delete')
        }
      },
      async ({ product_id }) => {
        const result = await stripeRequest(`/products/${product_id}`, 'DELETE');
        return {
          content: [
            {
              type: 'text',
              text: `Product deleted successfully: ${product_id}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_prices',
      {
        title: 'List Prices',
        description: 'List prices with optional filters',
        inputSchema: {
          product: z.string().optional().describe('Filter by product ID'),
          active: z.boolean().optional().describe('Filter by active status'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of prices to return (1-100)'),
          starting_after: z.string().optional().describe('Price ID for pagination')
        }
      },
      async ({ product, active, limit, starting_after }) => {
        const params: Record<string, any> = { limit };
        if (product) params.product = product;
        if (active !== undefined) params.active = active;
        if (starting_after) params.starting_after = starting_after;

        const result = await stripeRequest('/prices', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_price',
      {
        title: 'Create Price',
        description: 'Create a new price for a product',
        inputSchema: {
          product: z.string().describe('Product ID'),
          unit_amount: z.number().describe('Price in cents (e.g., 1000 for $10.00)'),
          currency: z.string().describe('Three-letter ISO currency code (e.g., usd, eur)'),
          recurring: z
            .object({
              interval: z.enum(['day', 'week', 'month', 'year']).describe('Billing interval'),
              interval_count: z
                .number()
                .optional()
                .describe('Number of intervals between billings')
            })
            .optional()
            .describe('Recurring billing settings'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ product, unit_amount, currency, recurring, metadata }) => {
        const body: Record<string, any> = { product, unit_amount, currency };
        if (recurring) body.recurring = recurring;
        if (metadata) body.metadata = metadata;

        const price = await stripeRequest('/prices', 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Price created successfully: ${price.id}\n\n${JSON.stringify(
                price,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    server.registerTool(
      'update_price',
      {
        title: 'Update Price',
        description: 'Update a price (limited fields can be updated)',
        inputSchema: {
          price_id: z.string().describe('The ID of the price to update'),
          active: z.boolean().optional().describe('Whether the price is active'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ price_id, active, metadata }) => {
        const body: Record<string, any> = {};
        if (active !== undefined) body.active = active;
        if (metadata) body.metadata = metadata;

        const price = await stripeRequest(`/prices/${price_id}`, 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Price updated successfully\n\n${JSON.stringify(price, null, 2)}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // REFUND MANAGEMENT TOOLS
    // ============================================================================

    server.registerTool(
      'list_refunds',
      {
        title: 'List Refunds',
        description: 'List refunds with optional filters',
        inputSchema: {
          charge: z.string().optional().describe('Filter by charge ID'),
          payment_intent: z.string().optional().describe('Filter by payment intent ID'),
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of refunds to return (1-100)'),
          starting_after: z.string().optional().describe('Refund ID for pagination')
        }
      },
      async ({ charge, payment_intent, limit, starting_after }) => {
        const params: Record<string, any> = { limit };
        if (charge) params.charge = charge;
        if (payment_intent) params.payment_intent = payment_intent;
        if (starting_after) params.starting_after = starting_after;

        const result = await stripeRequest('/refunds', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'create_refund',
      {
        title: 'Create Refund',
        description: 'Create a refund for a charge or payment intent',
        inputSchema: {
          charge: z.string().optional().describe('Charge ID to refund'),
          payment_intent: z.string().optional().describe('Payment intent ID to refund'),
          amount: z
            .number()
            .optional()
            .describe('Amount to refund in cents (defaults to full amount)'),
          reason: z
            .enum(['duplicate', 'fraudulent', 'requested_by_customer'])
            .optional()
            .describe('Reason for the refund'),
          metadata: z
            .record(z.string())
            .optional()
            .describe('Set of key-value pairs for custom metadata')
        }
      },
      async ({ charge, payment_intent, amount, reason, metadata }) => {
        const body: Record<string, any> = {};
        if (charge) body.charge = charge;
        if (payment_intent) body.payment_intent = payment_intent;
        if (amount) body.amount = amount;
        if (reason) body.reason = reason;
        if (metadata) body.metadata = metadata;

        const refund = await stripeRequest('/refunds', 'POST', body);
        return {
          content: [
            {
              type: 'text',
              text: `Refund created successfully: ${refund.id}\n\n${JSON.stringify(
                refund,
                null,
                2
              )}`
            }
          ]
        };
      }
    );

    // ============================================================================
    // BALANCE & PAYOUT TOOLS
    // ============================================================================

    server.registerTool(
      'get_balance',
      {
        title: 'Get Balance',
        description: 'Get the current account balance',
        inputSchema: {}
      },
      async () => {
        const balance = await stripeRequest('/balance');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(balance, null, 2)
            }
          ]
        };
      }
    );

    server.registerTool(
      'list_balance_transactions',
      {
        title: 'List Balance Transactions',
        description: 'List balance transactions',
        inputSchema: {
          limit: z
            .number()
            .optional()
            .default(10)
            .describe('Number of transactions to return (1-100)'),
          starting_after: z.string().optional().describe('Transaction ID for pagination'),
          type: z
            .string()
            .optional()
            .describe('Filter by transaction type (e.g., charge, refund, payout)')
        }
      },
      async ({ limit, starting_after, type }) => {
        const params: Record<string, any> = { limit };
        if (starting_after) params.starting_after = starting_after;
        if (type) params.type = type;

        const result = await stripeRequest('/balance_transactions', 'GET', params);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2)
            }
          ]
        };
      }
    );
  }
);
