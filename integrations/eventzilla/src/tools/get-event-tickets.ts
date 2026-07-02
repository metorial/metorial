import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let ticketSchema = z.object({
  ticketId: z.number().describe('Ticket type ID'),
  title: z.string().describe('Ticket type name'),
  price: z.string().optional().describe('Ticket price'),
  quantityTotal: z.string().optional().describe('Total quantity available'),
  description: z.string().optional().describe('Ticket description'),
  salesStartDate: z.string().optional().describe('Sales start date'),
  salesStartTime: z.string().optional().describe('Sales start time'),
  salesEndDate: z.string().optional().describe('Sales end date'),
  salesEndTime: z.string().optional().describe('Sales end time'),
  ticketType: z.string().optional().describe('Ticket type classification'),
  isVisible: z.boolean().optional().describe('Whether ticket is visible'),
  boxofficeOnly: z.boolean().optional().describe('Whether ticket is box office only'),
  limitMinimum: z.string().optional().describe('Minimum purchase limit'),
  limitMaximum: z.string().optional().describe('Maximum purchase limit'),
  groupDiscount: z.string().optional().describe('Group discount type'),
  groupPercentage: z.string().optional().describe('Group discount percentage'),
  groupPrice: z.string().optional().describe('Group discount price'),
  unlockCode: z.string().optional().describe('Unlock code for hidden tickets'),
  allowPartialPayment: z.boolean().optional().describe('Whether partial payment is allowed'),
  partialPaymentInstallments: z.string().optional().describe('Number of installments'),
  partialPaymentFrequency: z.string().optional().describe('Payment frequency'),
  partialPaymentAmount: z.string().optional().describe('Partial payment amount'),
  additionalInstructions: z.string().optional().describe('Additional instructions')
});

export let getEventTicketsTool = SlateTool.create(spec, {
  name: 'Get Event Tickets',
  key: 'get_event_tickets',
  description: `Retrieve all ticket types (categories) for a specific event, including pricing, sale windows, quantity limits, group discounts, partial payment options, and visibility settings.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      eventId: z.string().describe('The event ID to get tickets for')
    })
  )
  .output(
    z.object({
      tickets: z.array(ticketSchema).describe('List of ticket types for the event')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getEventTickets(ctx.input.eventId);
    let rawTickets = Array.isArray(data?.tickets)
      ? data.tickets
      : Array.isArray(data)
        ? data
        : [];

    let tickets = rawTickets.map((t: any) => ({
      ticketId: t.id,
      title: t.title,
      price: t.price,
      quantityTotal: t.quantity_total,
      description: t.description,
      salesStartDate: t.sales_start_date,
      salesStartTime: t.sales_start_time,
      salesEndDate: t.sales_end_date,
      salesEndTime: t.sales_end_time,
      ticketType: t.ticket_type,
      isVisible: t.is_visible,
      boxofficeOnly: t.boxoffice_only,
      limitMinimum: t.limit_minimum,
      limitMaximum: t.limit_maximum,
      groupDiscount: t.group_discount,
      groupPercentage: t.group_percentage,
      groupPrice: t.group_price,
      unlockCode: t.unlock_code,
      allowPartialPayment: t.allow_partial_payment,
      partialPaymentInstallments: t.partial_payment_installments,
      partialPaymentFrequency: t.partial_payment_frequency,
      partialPaymentAmount: t.partial_payment_amount,
      additionalInstructions: t.additional_instructions
    }));

    return {
      output: { tickets },
      message: `Found **${tickets.length}** ticket type(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();
