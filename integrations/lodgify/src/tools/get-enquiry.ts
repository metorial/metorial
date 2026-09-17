import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

type EnquiryGuest = {
  guest_name?: {
    first_name?: string | null;
    last_name?: string | null;
    full_name?: string | null;
  } | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
};

type EnquiryDetails = {
  id?: number | null;
  booking_type?: string | null;
  status?: string | null;
  source?: string | null;
  source_text?: string | null;
  guest?: EnquiryGuest | null;
  arrival?: string | null;
  departure?: string | null;
  total_guest_breakdown?: {
    adults?: number | null;
    children?: number | null;
    infants?: number | null;
    pets?: number | null;
  } | null;
  property_id?: number | null;
  property_name?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  is_replied?: boolean | null;
  is_deleted?: boolean | null;
  thread_uid?: string | null;
  messages?: unknown[] | null;
};

export let getEnquiry = SlateTool.create(spec, {
  name: 'Get Enquiry',
  key: 'get_enquiry',
  description: `Retrieve detailed information about a specific enquiry by its ID. Returns the enquiry's status, the guest who made it, the property and dates it asks about, the party size, and the ID of the conversation thread it belongs to.`,
  instructions: [
    'Pass the returned threadUid to the Get Message Thread tool to read the full conversation with the guest.',
    'When isDeleted is true the enquiry is in the trash and can be restored with the Update Enquiry Status tool.'
  ],
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      enquiryId: z.number().describe('The ID of the enquiry to retrieve')
    })
  )
  .output(
    z.object({
      enquiryId: z.number().describe('The ID of the enquiry'),
      status: z.string().optional().describe('Current status of the enquiry'),
      threadUid: z
        .string()
        .optional()
        .describe(
          'ID of the conversation thread this enquiry belongs to, for reading the full message history'
        ),
      guestName: z.string().optional().describe('Name of the guest who made the enquiry'),
      guestEmail: z.string().optional().describe('Email address of the guest'),
      guestPhone: z.string().optional().describe('Phone number of the guest'),
      propertyId: z
        .number()
        .optional()
        .describe('ID of the property the enquiry is about, if it names one'),
      propertyName: z
        .string()
        .optional()
        .describe('Name of the property the enquiry is about, if it names one'),
      arrival: z
        .string()
        .optional()
        .describe('Requested arrival date (YYYY-MM-DD), if the enquiry names dates'),
      departure: z
        .string()
        .optional()
        .describe('Requested departure date (YYYY-MM-DD), if the enquiry names dates'),
      guestBreakdown: z
        .object({
          adults: z.number().optional().describe('Number of adults'),
          children: z.number().optional().describe('Number of children'),
          infants: z.number().optional().describe('Number of infants'),
          pets: z.number().optional().describe('Number of pets')
        })
        .optional()
        .describe('Party size the enquiry is for'),
      source: z.string().optional().describe('Channel the enquiry came from'),
      sourceText: z
        .string()
        .optional()
        .describe('Free-text description of the enquiry source'),
      createdAt: z.string().optional().describe('When the enquiry was created'),
      updatedAt: z.string().optional().describe('When the enquiry was last updated'),
      isReplied: z.boolean().optional().describe('Whether the enquiry has been replied to'),
      isDeleted: z
        .boolean()
        .optional()
        .describe('Whether the enquiry is in the trash and can be restored'),
      messageCount: z.number().describe('Number of messages on the enquiry'),
      enquiry: z
        .record(z.string(), z.any())
        .describe('Full enquiry details as returned by Lodgify')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let enquiry: EnquiryDetails = await client.getEnquiry(ctx.input.enquiryId);

    let guest = enquiry.guest ?? undefined;
    let composedName = [guest?.guest_name?.first_name, guest?.guest_name?.last_name]
      .filter(Boolean)
      .join(' ');
    let guestName = guest?.guest_name?.full_name ?? (composedName || guest?.name) ?? undefined;

    let breakdown = enquiry.total_guest_breakdown ?? undefined;
    let enquiryId = enquiry.id ?? ctx.input.enquiryId;
    let status = enquiry.status ?? undefined;

    return {
      output: {
        enquiryId,
        status,
        threadUid: enquiry.thread_uid ?? undefined,
        guestName,
        guestEmail: guest?.email ?? undefined,
        guestPhone: guest?.phone ?? undefined,
        propertyId: enquiry.property_id ?? undefined,
        propertyName: enquiry.property_name ?? undefined,
        arrival: enquiry.arrival ?? undefined,
        departure: enquiry.departure ?? undefined,
        guestBreakdown: breakdown
          ? {
              adults: breakdown.adults ?? undefined,
              children: breakdown.children ?? undefined,
              infants: breakdown.infants ?? undefined,
              pets: breakdown.pets ?? undefined
            }
          : undefined,
        source: enquiry.source ?? undefined,
        sourceText: enquiry.source_text ?? undefined,
        createdAt: enquiry.created_at ?? undefined,
        updatedAt: enquiry.updated_at ?? undefined,
        isReplied: enquiry.is_replied ?? undefined,
        isDeleted: enquiry.is_deleted ?? undefined,
        messageCount: (enquiry.messages ?? []).length,
        enquiry
      },
      message: `Retrieved enquiry **#${enquiryId}** from **${guestName ?? 'Unknown guest'}** (status: ${status ?? 'unknown'}).`
    };
  })
  .build();
