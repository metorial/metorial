import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { asBoolean, asText, readCollection } from '../lib/responses';
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
      raw: z.unknown().optional().describe('Complete response returned by Eventzilla'),
      tickets: z.array(ticketSchema).describe('List of ticket types for the event'),
      donations: z
        .array(z.unknown())
        .optional()
        .describe('Donation ticket options returned by Eventzilla')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let data = await client.getEventTickets(ctx.input.eventId);
    let rawTickets = readCollection(data, 'tickets');

    let tickets = rawTickets.map((t: any) => ({
      ticketId: t.id,
      title: t.title,
      price: asText(t.price),
      quantityTotal: asText(t.quantity_total),
      description: t.description,
      salesStartDate: t.sales_start_date,
      salesStartTime: t.sales_start_time,
      salesEndDate: t.sales_end_date,
      salesEndTime: t.sales_end_time,
      ticketType: t.ticket_type ?? t.tickets,
      isVisible: asBoolean(t.is_visible ?? t.isvisible),
      boxofficeOnly: asBoolean(t.boxoffice_only),
      limitMinimum: asText(t.limit_minimum),
      limitMaximum: asText(t.limit_maximum),
      groupDiscount: asText(t.group_discount),
      groupPercentage: asText(t.group_percentage),
      groupPrice: asText(t.group_price),
      unlockCode: t.unlock_code,
      allowPartialPayment: asBoolean(t.allow_partial_payment),
      partialPaymentInstallments: asText(t.partial_payment_installments),
      partialPaymentFrequency: t.partial_payment_frequency,
      partialPaymentAmount: asText(t.partial_payment_amount),
      additionalInstructions: t.additional_instructions
    }));

    return {
      output: { tickets, donations: data.donation, raw: data },
      message: `Found **${tickets.length}** ticket type(s) for event ${ctx.input.eventId}.`
    };
  })
  .build();
