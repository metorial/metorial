import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggers when a customer is created or updated. Configure the webhook URL in RepairShopr under Admin > Notification Center.'
})
  .input(
    z.object({
      eventType: z.string().describe('Type of customer event'),
      customerId: z.number().describe('Customer ID'),
      webhookPayload: z.any().describe('Raw webhook payload')
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('Customer ID'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      fullname: z.string().optional().describe('Full name'),
      businessName: z.string().optional().describe('Business name'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      mobile: z.string().optional().describe('Mobile number'),
      address: z.string().optional().describe('Address'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State'),
      zip: z.string().optional().describe('ZIP/postal code'),
      createdAt: z.string().optional().describe('Creation timestamp'),
      updatedAt: z.string().optional().describe('Last updated timestamp')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let body: any;
      try {
        body = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!body) return { inputs: [] };

      let customer = body.customer || body;
      let customerId = customer.id || customer.customer_id;
      if (!customerId) return { inputs: [] };

      let eventType = body.type || body.event || body.action || 'updated';

      return {
        inputs: [
          {
            eventType: String(eventType),
            customerId: Number(customerId),
            webhookPayload: body
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let customer = ctx.input.webhookPayload?.customer || ctx.input.webhookPayload || {};
      let eventType = ctx.input.eventType.toLowerCase().replace(/\s+/g, '_');

      if (eventType.includes('creat') || eventType.includes('new')) {
        eventType = 'created';
      } else {
        eventType = 'updated';
      }

      return {
        type: `customer.${eventType}`,
        id: `customer_${ctx.input.customerId}_${eventType}_${customer.updated_at || Date.now()}`,
        output: {
          customerId: ctx.input.customerId,
          firstname: customer.firstname,
          lastname: customer.lastname,
          fullname: customer.fullname,
          businessName: customer.business_name,
          email: customer.email,
          phone: customer.phone,
          mobile: customer.mobile,
          address: customer.address,
          city: customer.city,
          state: customer.state,
          zip: customer.zip,
          createdAt: customer.created_at,
          updatedAt: customer.updated_at
        }
      };
    }
  })
  .build();
