import { z } from 'zod';
import { validateInteger } from './client';
import { readItem } from './responses';

export let freeTicketInput = z.object({
  eventId: z.string().describe('Event ID from list_events'),
  ticketTypeName: z.string().describe('Name displayed for this free ticket type'),
  quantityTotal: z.number().describe('Total available quantity as a non-negative integer'),
  ticketTypeDescription: z.string().describe('Public description shown to attendees'),
  salesStartDate: z.string().describe('Sales opening date, preferably YYYY-MM-DD'),
  salesEndDate: z.string().describe('Sales closing date, preferably YYYY-MM-DD'),
  salesStartTime: z.string().describe('Sales opening time, for example 09:00'),
  salesEndTime: z.string().describe('Sales closing time, for example 23:00'),
  limitMinimum: z.number().describe('Minimum quantity per order as a non-negative integer'),
  limitMaximum: z.number().describe('Maximum quantity per order as a positive integer'),
  isVisible: z.boolean().describe('Whether visible on the registration page'),
  boxofficeOnly: z.boolean().describe('Whether available only for box office sales'),
  additionalInstructions: z
    .string()
    .optional()
    .describe('Additional instructions shown to attendees'),
  unlockCode: z.string().optional().describe('Code needed to unlock a restricted ticket type')
});

export let freeTicketOutput = z.object({
  ticketTypeId: z.number().describe('Ticket type ID returned by Eventzilla'),
  ticketTypeName: z.string().optional(),
  quantityTotal: z.number().optional(),
  ticketTypeDescription: z.string().optional(),
  salesStartDate: z.string().optional(),
  salesEndDate: z.string().optional(),
  salesStartTime: z.string().optional(),
  salesEndTime: z.string().optional(),
  limitMinimum: z.number().optional(),
  limitMaximum: z.number().optional(),
  isVisible: z.boolean().optional(),
  boxofficeOnly: z.boolean().optional(),
  additionalInstructions: z.string().optional(),
  unlockCode: z.string().optional(),
  raw: z.unknown().optional().describe('Complete response returned by Eventzilla')
});

export let mapFreeTicket = (data: unknown) => {
  let ticket = readItem(data, 'ticket_types');
  validateInteger(ticket.ticket_type_id, 'Eventzilla response ticket_type_id');
  return {
    ticketTypeId: ticket.ticket_type_id as number,
    ticketTypeName: ticket.ticket_type_name,
    quantityTotal: ticket.quantity_total,
    ticketTypeDescription: ticket.ticket_type_description,
    salesStartDate: ticket.sales_start_date,
    salesEndDate: ticket.sales_end_date,
    salesStartTime: ticket.sales_start_time,
    salesEndTime: ticket.sales_end_time,
    limitMinimum: ticket.limit_minimum,
    limitMaximum: ticket.limit_maximum,
    isVisible: ticket.is_visible,
    boxofficeOnly: ticket.boxoffice_only,
    additionalInstructions: ticket.additional_instructions,
    unlockCode: ticket.unlock_code,
    raw: data
  };
};
