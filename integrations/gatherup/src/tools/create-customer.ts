import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

export let createCustomer = SlateTool.create(spec, {
  name: 'Create Customer',
  key: 'create_customer',
  description: `Create a new customer associated with a business location. This is the primary way to sync customers from CRM, POS, or other systems into GatherUp. Optionally triggers a feedback request immediately upon creation.`,
  instructions: [
    'Either email or phone is required depending on the business subscription plan.',
    'Set sendFeedbackRequest to true to immediately request feedback from the customer.',
    'Use delayHours to schedule the feedback request for later.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      businessId: z.number().describe('Business ID to associate the customer with'),
      firstName: z.string().describe('Customer first name'),
      lastName: z.string().describe('Customer last name'),
      email: z.string().optional().describe('Customer email address'),
      phone: z.string().optional().describe('Customer phone number'),
      customId: z.string().optional().describe('Custom identifier for the customer'),
      jobId: z.string().optional().describe('Job identifier'),
      tags: z.string().optional().describe('Comma-separated tags (max 50 chars per tag)'),
      preference: z.enum(['email', 'sms']).optional().describe('Communication preference'),
      sendFeedbackRequest: z
        .boolean()
        .optional()
        .describe('Immediately send a feedback request'),
      delayHours: z
        .number()
        .optional()
        .describe(
          'Hours to delay a requested feedback message (0 = immediate). The business must use Manual Mode; Automatic Mode ignores this delay.'
        )
    })
  )
  .output(
    z.object({
      customerId: z.number().describe('ID of the created customer'),
      feedbackRequestSent: z
        .boolean()
        .optional()
        .describe('Whether a feedback request was sent'),
      feedbackRequestError: z
        .string()
        .optional()
        .describe('Error message if feedback request failed')
    })
  )
  .handleInvocation(async ctx => {
    if (!ctx.input.email?.trim() && !ctx.input.phone?.trim()) {
      throw createApiServiceError(
        'Provide an email address or phone number for the customer.'
      );
    }
    let client = createClient(ctx);
    let data = await client.createCustomer({
      businessId: ctx.input.businessId,
      customerFirstName: ctx.input.firstName,
      customerLastName: ctx.input.lastName,
      customerEmail: ctx.input.email,
      customerPhone: ctx.input.phone,
      customerCustomId: ctx.input.customId,
      customerJobId: ctx.input.jobId,
      customerTags: ctx.input.tags,
      customerPreference: ctx.input.preference,
      sendFeedbackRequest: ctx.input.sendFeedbackRequest ? 1 : 0,
      delayFeedbackRequest: ctx.input.delayHours
    });

    let requestCode = data.feedbackRequestErrorCode;
    let requestSucceeded = requestCode === undefined ? undefined : Number(requestCode) === 0;
    let requestError =
      requestCode !== undefined && !requestSucceeded
        ? data.feedbackRequestErrorMessage
        : undefined;

    return {
      output: {
        customerId: data.customerId,
        feedbackRequestSent: requestSucceeded,
        feedbackRequestError: requestError
      },
      message: `Created customer **${ctx.input.firstName} ${ctx.input.lastName}** with ID **${data.customerId}**.${requestError ? ` Feedback request failed: ${requestError}` : requestSucceeded ? (ctx.input.delayHours ? ' Feedback request accepted; any delay depends on the business communication mode.' : ' Feedback request sent.') : ''}`
    };
  })
  .build();
