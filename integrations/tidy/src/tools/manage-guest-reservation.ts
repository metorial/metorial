import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let reservationOutputSchema = z.object({
  reservationId: z.string().describe('Unique identifier for the reservation'),
  addressId: z.string().describe('ID of the address for the reservation'),
  jobId: z.string().nullable().describe('ID of the associated job, if any'),
  checkInDate: z.string().describe('Check-in date'),
  checkInTime: z.string().nullable().describe('Check-in time (defaults to 14:00)'),
  checkOutDate: z.string().describe('Check-out date'),
  checkOutTime: z.string().nullable().describe('Check-out time (defaults to 11:00)'),
  createdAt: z.string().nullable().describe('Timestamp when the reservation was created')
});

let mapReservation = (data: any) => ({
  reservationId: data.id,
  addressId: data.address_id,
  jobId: data.job_id ?? null,
  checkInDate: data.check_in?.date ?? data.check_in_date ?? '',
  checkInTime: data.check_in?.time ?? data.check_in_time ?? null,
  checkOutDate: data.check_out?.date ?? data.check_out_date ?? '',
  checkOutTime: data.check_out?.time ?? data.check_out_time ?? null,
  createdAt: data.created_at ?? null
});

export let listGuestReservations = SlateTool.create(spec, {
  name: 'List Guest Reservations',
  key: 'list_guest_reservations',
  description: `List all guest reservations for your properties. Optionally filter by address. Useful for managing short-term rental turnovers and coordinating cleaning around guest schedules.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      addressId: z.string().optional().describe('Filter reservations by address ID')
    })
  )
  .output(
    z.object({
      reservations: z.array(reservationOutputSchema).describe('List of guest reservations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.listGuestReservations(ctx.input.addressId);
    let reservations = (result.data ?? result ?? []).map(mapReservation);

    return {
      output: { reservations },
      message: `Found **${reservations.length}** guest reservation(s).`
    };
  })
  .build();

export let getGuestReservation = SlateTool.create(spec, {
  name: 'Get Guest Reservation',
  key: 'get_guest_reservation',
  description: `Retrieve detailed information about a specific guest reservation, including check-in/check-out dates and times, and any associated job.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      reservationId: z.string().describe('ID of the guest reservation to retrieve')
    })
  )
  .output(reservationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.getGuestReservation(ctx.input.reservationId);
    let reservation = mapReservation(result);

    return {
      output: reservation,
      message: `Retrieved reservation **${reservation.reservationId}** (check-in: ${reservation.checkInDate}, check-out: ${reservation.checkOutDate}).`
    };
  })
  .build();

export let createGuestReservation = SlateTool.create(spec, {
  name: 'Create Guest Reservation',
  key: 'create_guest_reservation',
  description: `Create a new guest reservation at a property. Reservations are linked to addresses and help coordinate cleaning around guest check-in and check-out schedules. Default check-in time is 14:00 and check-out time is 11:00.`
})
  .input(
    z.object({
      addressId: z.string().describe('ID of the address for the reservation'),
      checkInDate: z.string().describe('Check-in date (YYYY-MM-DD)'),
      checkOutDate: z.string().describe('Check-out date (YYYY-MM-DD)'),
      checkInTime: z.string().optional().describe('Check-in time (HH:MM, defaults to 14:00)'),
      checkOutTime: z.string().optional().describe('Check-out time (HH:MM, defaults to 11:00)')
    })
  )
  .output(reservationOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let result = await client.createGuestReservation(ctx.input);
    let reservation = mapReservation(result);

    return {
      output: reservation,
      message: `Created reservation **${reservation.reservationId}** at address ${reservation.addressId} (${reservation.checkInDate} to ${reservation.checkOutDate}).`
    };
  })
  .build();

export let deleteGuestReservation = SlateTool.create(spec, {
  name: 'Delete Guest Reservation',
  key: 'delete_guest_reservation',
  description: `Delete a guest reservation. This removes the reservation record but does not affect any associated jobs that have already been created.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      reservationId: z.string().describe('ID of the guest reservation to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the reservation was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    await client.deleteGuestReservation(ctx.input.reservationId);

    return {
      output: { deleted: true },
      message: `Deleted guest reservation **${ctx.input.reservationId}**.`
    };
  })
  .build();
