import { SlateTool } from 'slates';
import { z } from 'zod';
import { PlanyoClient } from '../lib/client';
import { spec } from '../spec';

export let getReservation = SlateTool.create(spec, {
  name: 'Get Reservation',
  key: 'get_reservation',
  description: `Retrieves complete details of a single reservation including customer info, pricing, payments, custom properties, additional products, and activity log.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      reservationId: z.string().describe('ID of the reservation to retrieve')
    })
  )
  .output(
    z.object({
      reservationId: z.string().describe('Reservation ID'),
      resourceId: z.string().describe('Resource ID'),
      resourceName: z.string().optional().describe('Resource name'),
      siteId: z.string().optional().describe('Site ID'),
      userId: z.string().optional().describe('Customer user ID'),
      email: z.string().optional().describe('Customer email'),
      firstName: z.string().optional().describe('Customer first name'),
      lastName: z.string().optional().describe('Customer last name'),
      startTime: z.string().optional().describe('Reservation start time'),
      endTime: z.string().optional().describe('Reservation end time'),
      creationTime: z.string().optional().describe('When the reservation was created'),
      status: z.string().optional().describe('Current reservation status'),
      quantity: z.number().optional().describe('Number of units reserved'),
      totalPrice: z.number().optional().describe('Total price'),
      originalPrice: z.number().optional().describe('Price before discounts'),
      amountPaid: z.number().optional().describe('Amount already paid'),
      currency: z.string().optional().describe('Currency code'),
      discount: z.number().optional().describe('Discount amount'),
      userNotes: z.string().optional().describe('Customer notes'),
      adminNotes: z.string().optional().describe('Private admin notes'),
      address: z.string().optional().describe('Customer address'),
      city: z.string().optional().describe('Customer city'),
      zip: z.string().optional().describe('Customer zip/postal code'),
      state: z.string().optional().describe('Customer state'),
      country: z.string().optional().describe('Customer country'),
      phoneNumber: z.string().optional().describe('Customer phone number'),
      mobileNumber: z.string().optional().describe('Customer mobile number'),
      unitAssignment: z.string().optional().describe('Assigned unit name'),
      properties: z.any().optional().describe('Custom reservation form field values'),
      regularProducts: z
        .any()
        .optional()
        .describe('Additional products attached to the reservation'),
      customProducts: z
        .any()
        .optional()
        .describe('Custom products attached to the reservation')
    })
  )
  .handleInvocation(async ctx => {
    let client = new PlanyoClient(ctx.auth, ctx.config);

    let r = await client.getReservationData(ctx.input.reservationId);

    return {
      output: {
        reservationId: ctx.input.reservationId,
        resourceId: String(r.resource_id),
        resourceName: r.name,
        siteId: r.site_id ? String(r.site_id) : undefined,
        userId: r.user_id ? String(r.user_id) : undefined,
        email: r.email,
        firstName: r.first_name,
        lastName: r.last_name,
        startTime: r.start_time ? String(r.start_time) : undefined,
        endTime: r.end_time ? String(r.end_time) : undefined,
        creationTime: r.creation_time ? String(r.creation_time) : undefined,
        status: r.status ? String(r.status) : undefined,
        quantity: r.quantity != null ? Number(r.quantity) : undefined,
        totalPrice: r.total_price != null ? Number(r.total_price) : undefined,
        originalPrice: r.original_price != null ? Number(r.original_price) : undefined,
        amountPaid: r.amount_paid != null ? Number(r.amount_paid) : undefined,
        currency: r.currency,
        discount: r.discount != null ? Number(r.discount) : undefined,
        userNotes: r.user_notes,
        adminNotes: r.admin_notes,
        address: r.address,
        city: r.city,
        zip: r.zip,
        state: r.state,
        country: r.country,
        phoneNumber: r.phone_number,
        mobileNumber: r.mobile_number,
        unitAssignment: r.unit_assignment,
        properties: r.properties,
        regularProducts: r.regular_products,
        customProducts: r.custom_products
      },
      message: `Retrieved reservation **#${ctx.input.reservationId}** for resource "${r.name || r.resource_id}" (${r.email || 'unknown customer'}).`
    };
  })
  .build();
