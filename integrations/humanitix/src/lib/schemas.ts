import { z } from 'zod';

export let eventIdSchema = z
  .string()
  .describe('Event ID. Call list_events to discover events and their IDs.');
export let overrideLocationSchema = z
  .string()
  .length(2)
  .optional()
  .describe(
    'Optional ISO 3166-1 alpha-2 country code to override the account location for this request.'
  );
export let sinceSchema = z.iso
  .datetime({ offset: true })
  .optional()
  .describe('Return results since this ISO 8601 date and time.');

export let ticketSchema = z.object({
  ticketId: z.string().describe('Unique identifier for the ticket'),
  number: z.number().optional().describe('Ticket number'),
  firstName: z.string().optional().describe('Ticket holder first name'),
  lastName: z.string().optional().describe('Ticket holder last name'),
  status: z.string().optional().describe('Ticket status'),
  price: z.number().optional().describe('Ticket price'),
  netPrice: z.number().optional().describe('Net price after adjustments'),
  fee: z.number().optional().describe('Booking fee'),
  taxes: z.number().optional().describe('Tax amount'),
  total: z.number().optional().describe('Total ticket cost'),
  orderId: z.string().optional().describe('ID of the associated order'),
  eventId: z.string().optional().describe('ID of the associated event'),
  ticketTypeId: z.string().optional().describe('ID of the ticket type'),
  ticketTypeName: z.string().optional().describe('Name of the ticket type'),
  isDonation: z.boolean().optional().describe('Whether this ticket is a donation'),
  checkInHistory: z.array(z.any()).optional().describe('Check-in history entries'),
  qrCodeData: z.any().optional().describe('QR code data for the ticket'),
  eventDateId: z.string().optional().describe('Specific event date ID'),
  orderName: z.string().optional().describe('Buyer-facing order reference'),
  currency: z.string().optional().describe('Currency used for pricing'),
  organisation: z.string().optional().describe('Ticket holder organisation'),
  checkIn: z.any().optional().describe('Current check-in status and most recent scan'),
  seatingLocation: z.any().optional().describe('Assigned seating details'),
  additionalFields: z.array(z.any()).optional().describe('Answers to additional questions'),
  cancelledAt: z.string().optional().describe('When the ticket was cancelled'),
  createdAt: z.string().optional().describe('When the ticket was created'),
  updatedAt: z.string().optional().describe('When the ticket was last updated'),
  totalsV2: z
    .any()
    .optional()
    .describe('Detailed fee breakdown including absorb/pass-on splits')
});

export let tagSchema = z.object({
  tagId: z.string().describe('Unique identifier for the tag'),
  name: z.string().optional().describe('Name of the tag'),
  userId: z.string().optional().describe('ID of the user who owns the tag'),
  location: z.string().optional().describe('Location reference for the tag'),
  createdAt: z.string().optional().describe('When the tag was created'),
  updatedAt: z.string().optional().describe('When the tag was last updated')
});

type HumanitixTicket = Omit<z.infer<typeof ticketSchema>, 'ticketId'> & { _id: string };

export let mapTicket = (ticket: HumanitixTicket) => ({
  ticketId: ticket._id,
  number: ticket.number,
  firstName: ticket.firstName,
  lastName: ticket.lastName,
  status: ticket.status,
  price: ticket.price,
  netPrice: ticket.netPrice,
  fee: ticket.fee,
  taxes: ticket.taxes,
  total: ticket.total,
  orderId: ticket.orderId,
  eventId: ticket.eventId,
  ticketTypeId: ticket.ticketTypeId,
  ticketTypeName: ticket.ticketTypeName,
  isDonation: ticket.isDonation,
  checkInHistory: ticket.checkInHistory,
  qrCodeData: ticket.qrCodeData,
  eventDateId: ticket.eventDateId,
  orderName: ticket.orderName,
  currency: ticket.currency,
  organisation: ticket.organisation,
  checkIn: ticket.checkIn,
  seatingLocation: ticket.seatingLocation,
  additionalFields: ticket.additionalFields,
  cancelledAt: ticket.cancelledAt,
  createdAt: ticket.createdAt,
  updatedAt: ticket.updatedAt,
  totalsV2: ticket.totalsV2
});
