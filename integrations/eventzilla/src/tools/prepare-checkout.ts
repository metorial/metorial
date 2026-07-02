import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let prepareCheckoutTool = SlateTool.create(spec, {
  name: 'Prepare Checkout',
  key: 'prepare_checkout',
  description: `Retrieve checkout configuration for an event, including available ticket types, payment options, custom registration questions, and discount/tax settings. This is the first step of the checkout flow before creating a checkout.`,
  instructions: [
    'Use the returned ticket type IDs and payment option IDs when creating a checkout.',
    'The dateId can be obtained from the event details (dateId field).'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID'),
      dateId: z.string().describe('The event date ID (from event details)')
    })
  )
  .output(
    z.object({
      paymentOptions: z
        .array(
          z.object({
            paymentId: z.number().describe('Payment option ID'),
            paymentOptionName: z.string().describe('Payment option name')
          })
        )
        .optional()
        .describe('Available payment options'),
      ticketTypes: z
        .array(
          z.object({
            ticketTypeId: z.number().describe('Ticket type ID'),
            ticketTypeName: z.string().describe('Ticket type name'),
            ticketTypePrice: z.string().optional().describe('Ticket price'),
            ticketTypeMinLimit: z.number().optional().describe('Minimum purchase limit'),
            ticketTypeMaxLimit: z.number().optional().describe('Maximum purchase limit'),
            ticketTypeAvailQuantity: z.number().optional().describe('Available quantity'),
            ticketTypeOnSale: z.boolean().optional().describe('Whether on sale'),
            ticketTypeDescription: z.string().optional().describe('Ticket description')
          })
        )
        .optional()
        .describe('Available ticket types'),
      questions: z
        .array(
          z.object({
            questionId: z.number().describe('Question ID'),
            questionType: z.string().optional().describe('Question type'),
            questionText: z.string().describe('Question text'),
            questionChoices: z.array(z.any()).optional().describe('Available choices'),
            questionWaiver: z.string().optional().describe('Waiver text'),
            hasSubquestion: z
              .boolean()
              .optional()
              .describe('Whether question has sub-questions')
          })
        )
        .optional()
        .describe('Custom registration questions'),
      discountEnabled: z.boolean().optional().describe('Whether discounts are enabled'),
      taxEnabled: z.boolean().optional().describe('Whether tax is enabled'),
      taxes: z
        .array(
          z.object({
            taxType: z.string().optional().describe('Tax type'),
            taxName: z.string().optional().describe('Tax name'),
            taxValue: z.string().optional().describe('Tax value')
          })
        )
        .optional()
        .describe('Tax configuration')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.prepareCheckout(ctx.input.eventId, ctx.input.dateId);

    let paymentOptions = data.payment_options?.map((p: any) => ({
      paymentId: p.payment_id,
      paymentOptionName: p.paymentoption_name
    }));

    let ticketTypes = data.tickettypes?.map((t: any) => ({
      ticketTypeId: t.ticket_type_id,
      ticketTypeName: t.ticket_type_name,
      ticketTypePrice: t.ticket_type_price,
      ticketTypeMinLimit: t.ticket_type_min_limit,
      ticketTypeMaxLimit: t.ticket_type_max_limit,
      ticketTypeAvailQuantity: t.ticket_type_avail_quantity,
      ticketTypeOnSale: t.ticket_type_onsale,
      ticketTypeDescription: t.ticket_type_description
    }));

    let questions = data.questions?.map((q: any) => ({
      questionId: q.question_id,
      questionType: q.question_type,
      questionText: q.question_text,
      questionChoices: q.question_choices,
      questionWaiver: q.question_waiver,
      hasSubquestion: q.has_subquestion
    }));

    let taxes = data.tax?.map((t: any) => ({
      taxType: t.tax_type,
      taxName: t.tax_name,
      taxValue: t.tax_value
    }));

    return {
      output: {
        paymentOptions,
        ticketTypes,
        questions,
        discountEnabled: data.discount_enabled,
        taxEnabled: data.tax_enabled,
        taxes
      },
      message: `Checkout prepared with **${ticketTypes?.length ?? 0}** ticket type(s) and **${paymentOptions?.length ?? 0}** payment option(s).`
    };
  })
  .build();
