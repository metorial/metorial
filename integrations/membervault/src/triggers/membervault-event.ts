import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let membervaultEvent = SlateTrigger.create(spec, {
  name: 'MemberVault Event',
  key: 'membervault_event',
  description:
    'Fires when a MemberVault event occurs via the Actions webhook system. Covers user signups, lesson completions, module completions, engagement point thresholds, hot lead detection, email consent changes, action completions, account creation, and first logins.',
  instructions: [
    'Configure the webhook URL in MemberVault admin under the Actions page. Set the action to send an HTTP POST to the provided webhook URL when the desired event occurs.'
  ]
})
  .input(
    z.object({
      eventType: z.string().describe('Type of event that occurred'),
      email: z.string().describe('Email address of the user involved'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      productId: z.string().optional().describe('Product ID associated with the event'),
      productName: z.string().optional().describe('Product name associated with the event'),
      rawPayload: z
        .record(z.string(), z.unknown())
        .describe('Full raw payload from the webhook')
    })
  )
  .output(
    z.object({
      email: z.string().describe('Email address of the user'),
      firstName: z.string().optional().describe('First name of the user'),
      lastName: z.string().optional().describe('Last name of the user'),
      productId: z.string().optional().describe('Product ID associated with the event'),
      productName: z.string().optional().describe('Product name associated with the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: Record<string, unknown>;

      try {
        data = (await ctx.request.json()) as Record<string, unknown>;
      } catch {
        return { inputs: [] };
      }

      if (!data || typeof data !== 'object') {
        return { inputs: [] };
      }

      let email = String(data.email ?? data.user_email ?? '');
      if (!email) {
        return { inputs: [] };
      }

      let eventType = String(data.event_type ?? data.type ?? data.action ?? 'unknown');

      let firstName = data.first_name ?? data.firstName;
      let lastName = data.last_name ?? data.lastName;
      let productId = data.course_id ?? data.product_id ?? data.courseId ?? data.productId;
      let productName =
        data.course_name ?? data.product_name ?? data.courseName ?? data.productName;

      return {
        inputs: [
          {
            eventType,
            email,
            firstName: firstName ? String(firstName) : undefined,
            lastName: lastName ? String(lastName) : undefined,
            productId: productId ? String(productId) : undefined,
            productName: productName ? String(productName) : undefined,
            rawPayload: data
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let eventId = `${ctx.input.eventType}-${ctx.input.email}-${Date.now()}`;

      return {
        type: `user.${ctx.input.eventType}`,
        id: eventId,
        output: {
          email: ctx.input.email,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          productId: ctx.input.productId,
          productName: ctx.input.productName
        }
      };
    }
  })
  .build();
