import { SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { spec } from '../spec';
import { customerEventSchema, referenceId } from './event-schemas';
import { matchesStripeEvent } from './event-types';
import { stripeEvents } from './events-trigger-group';

export let customerEvents = SlateTrigger.create(spec, {
  name: 'Customer Events',
  key: 'customer_events',
  description:
    'Triggered when customer-related events occur, including customer creation, updates, deletion, and changes to legacy payment sources.'
})
  .triggerGroup(stripeEvents)
  .input(customerEventSchema)
  .output(
    z.object({
      customerId: z.string().describe('Customer ID'),
      email: z.string().optional().nullable().describe('Customer email'),
      name: z.string().optional().nullable().describe('Customer name'),
      phone: z.string().optional().nullable().describe('Customer phone'),
      description: z.string().optional().nullable().describe('Customer description'),
      deleted: z.boolean().optional().describe('Whether the customer was deleted'),
      created: z.number().optional().describe('Customer creation timestamp')
    })
  )
  .matches(payload => matchesStripeEvent('customer', payload))
  .map(async ctx => {
    const resource = ctx.input.data.object;

    const isCustomerObject = resource.object === 'customer';

    return {
      type: ctx.input.type,
      id: ctx.input.id,
      output: {
        customerId: isCustomerObject ? resource.id : referenceId(resource.customer),
        email: isCustomerObject ? resource.email || null : null,
        name: isCustomerObject ? resource.name || null : null,
        phone: isCustomerObject ? resource.phone || null : null,
        description: isCustomerObject ? resource.description || null : null,
        deleted: isCustomerObject && ctx.input.type === 'customer.deleted',
        created: isCustomerObject ? resource.created : undefined
      }
    };
  })
  .build();
