import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let splitGuestName = (fullName: string) => {
  let parts = fullName.trim().split(/\s+/);

  return {
    first_name: parts[0] ?? fullName.trim(),
    last_name: parts.length > 1 ? parts.slice(1).join(' ') : undefined
  };
};

export let createEnquiry = SlateTool.create(spec, {
  name: 'Create Enquiry',
  key: 'create_enquiry',
  description: `Create a new enquiry, the pre-booking request a guest makes before committing to a reservation. Only the guest's name and party size are required, so an enquiry can be recorded for a general question that names no property and no dates. Returns the enquiry ID, which can later be used to reply to the guest, change the enquiry's status, or upgrade the enquiry into a booking while keeping its message history.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'propertyId, roomTypeId, arrival and departure are all optional; omit them for a general enquiry that does not name a property or dates.',
    'Use the Get Property tool first to find valid room type IDs for a property.',
    'Set sourceAddress to the sender address when recording an enquiry that arrived by email.',
    'message is recorded as the guest\'s own words by default; set messageType to "Owner" when the text is something you wrote rather than what the guest asked.',
    'To turn the enquiry into a booking later, pass the returned enquiryId to the Create Booking tool so the message history is preserved.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      guestName: z.string().describe('Full name of the guest making the enquiry'),
      guestEmail: z.string().optional().describe('Email address of the guest'),
      guestPhone: z.string().optional().describe('Phone number of the guest'),
      adults: z.number().min(0).describe('Number of adults in the enquiring party'),
      children: z.number().min(0).optional().describe('Number of children in the party'),
      infants: z.number().min(0).optional().describe('Number of infants in the party'),
      pets: z.number().min(0).optional().describe('Number of pets in the party'),
      propertyId: z
        .number()
        .optional()
        .describe('The ID of the property the enquiry is about, if it names one'),
      roomTypeId: z
        .number()
        .optional()
        .describe('The ID of the room type the enquiry is about, if it names one'),
      arrival: z
        .string()
        .optional()
        .describe('Requested arrival/check-in date (YYYY-MM-DD), if the enquiry names dates'),
      departure: z
        .string()
        .optional()
        .describe(
          'Requested departure/check-out date (YYYY-MM-DD), if the enquiry names dates'
        ),
      status: z
        .string()
        .optional()
        .describe('Status to create the enquiry with. Defaults to "Open" when omitted'),
      message: z
        .string()
        .optional()
        .describe('An initial message to attach to the enquiry conversation'),
      messageSubject: z.string().optional().describe('Subject line for the initial message'),
      messageType: z
        .enum(['Owner', 'Comment', 'Renter'])
        .optional()
        .default('Renter')
        .describe(
          'Who the initial message came from. "Renter" records it as the guest\'s own words, which is what you want when transcribing an enquiry that arrived by email or phone. "Owner" records it as a message from the property manager. "Comment" records it as an internal note the guest never sees. Defaults to "Renter"'
        ),
      sourceText: z
        .string()
        .optional()
        .describe('Where the enquiry came from, e.g. "Phone call" or "Website form"'),
      sourceAddress: z
        .string()
        .optional()
        .describe('The sender email address, when the enquiry arrived by email'),
      hasPrivacyConsent: z
        .boolean()
        .optional()
        .describe('Whether the guest has given privacy consent')
    })
  )
  .output(
    z.object({
      enquiryId: z
        .number()
        .describe(
          'The ID of the newly created enquiry. Use it to read the enquiry, reply to the guest, change its status, or upgrade it into a booking'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let guestName = ctx.input.guestName.trim();
    if (!guestName) {
      throw createApiServiceError('guestName must contain the name of the enquiring guest.');
    }

    let created = await client.createEnquiry({
      property_id: ctx.input.propertyId,
      room_type_id: ctx.input.roomTypeId,
      arrival: ctx.input.arrival,
      departure: ctx.input.departure,
      guest_breakdown: {
        adults: ctx.input.adults,
        children: ctx.input.children,
        infants: ctx.input.infants,
        pets: ctx.input.pets
      },
      guest: {
        guest_name: splitGuestName(guestName),
        email: ctx.input.guestEmail,
        phone: ctx.input.guestPhone
      },
      // Messages attached at creation time cannot carry a message_id; only the
      // dedicated enquiry messages endpoint accepts one.
      messages: ctx.input.message
        ? [
            {
              subject: ctx.input.messageSubject,
              message: ctx.input.message,
              type: ctx.input.messageType
            }
          ]
        : undefined,
      source_text: ctx.input.sourceText,
      source_address: ctx.input.sourceAddress,
      status: ctx.input.status,
      has_privacy_consent: ctx.input.hasPrivacyConsent
    });

    let enquiryId = typeof created === 'number' ? created : Number(created?.id ?? created);

    if (!Number.isFinite(enquiryId)) {
      throw createApiServiceError(
        'The enquiry was submitted but Lodgify did not return an enquiry ID. Check the inbox to confirm whether it was created.'
      );
    }

    let scope = ctx.input.propertyId ? ` at property #${ctx.input.propertyId}` : '';
    let dates =
      ctx.input.arrival && ctx.input.departure
        ? ` (${ctx.input.arrival} to ${ctx.input.departure})`
        : '';

    return {
      output: { enquiryId },
      message: `Created enquiry **#${enquiryId}** for **${guestName}**${scope}${dates}.`
    };
  })
  .build();
