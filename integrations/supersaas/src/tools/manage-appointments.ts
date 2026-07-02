import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let appointmentSchema = z.object({
  appointmentId: z.string().optional().describe('SuperSaaS appointment ID'),
  start: z.string().optional().describe('Start date/time'),
  finish: z.string().optional().describe('End date/time'),
  resourceName: z.string().optional().describe('Resource name'),
  resourceId: z.string().optional().describe('Resource ID'),
  serviceName: z.string().optional().describe('Service name'),
  serviceId: z.string().optional().describe('Service ID'),
  fullName: z.string().optional().describe('Booker full name'),
  email: z.string().optional().describe('Booker email'),
  phone: z.string().optional().describe('Booker phone'),
  mobile: z.string().optional().describe('Booker mobile'),
  address: z.string().optional().describe('Booker address'),
  userId: z.string().optional().describe('Booker user ID'),
  status: z.string().optional().describe('Appointment status'),
  price: z.string().optional().describe('Appointment price'),
  slotId: z.string().optional().describe('Slot ID'),
  deleted: z.boolean().optional().describe('Whether appointment is deleted'),
  waitlisted: z.boolean().optional().describe('Whether appointment is waitlisted'),
  createdOn: z.string().optional().describe('UTC creation timestamp'),
  updatedOn: z.string().optional().describe('UTC last update timestamp')
});

export let listAppointmentsTool = SlateTool.create(spec, {
  name: 'List Appointments',
  key: 'list_appointments',
  description: `Retrieve appointments from a schedule within a date range. Supports filtering by user and optional form data inclusion.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleId: z.string().describe('Schedule ID to query appointments from'),
      from: z
        .string()
        .optional()
        .describe('Start date filter (ISO format YYYY-MM-DD HH:MM:SS)'),
      to: z.string().optional().describe('End date filter (ISO format YYYY-MM-DD HH:MM:SS)'),
      userId: z.string().optional().describe('Filter by user ID, username, or foreign key'),
      limit: z.number().optional().describe('Maximum number of results'),
      offset: z.number().optional().describe('Pagination offset'),
      includeFormData: z.boolean().optional().describe('Whether to include attached form data')
    })
  )
  .output(
    z.object({
      appointments: z.array(appointmentSchema).describe('List of appointments')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.listAppointments(ctx.input.scheduleId, {
      from: ctx.input.from,
      to: ctx.input.to,
      limit: ctx.input.limit,
      offset: ctx.input.offset,
      form: ctx.input.includeFormData,
      user: ctx.input.userId
    });

    let appointments = Array.isArray(data) ? data.map(mapAppointmentResponse) : [];

    return {
      output: { appointments },
      message: `Found **${appointments.length}** appointment(s) on schedule **${ctx.input.scheduleId}**.`
    };
  })
  .build();

export let getAppointmentTool = SlateTool.create(spec, {
  name: 'Get Appointment',
  key: 'get_appointment',
  description: `Retrieve a single appointment by its ID.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      appointmentId: z.string().describe('The appointment ID to retrieve')
    })
  )
  .output(appointmentSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.getAppointment(ctx.input.appointmentId);
    let appointment = mapAppointmentResponse(data);

    return {
      output: appointment,
      message: `Retrieved appointment **${ctx.input.appointmentId}**.`
    };
  })
  .build();

export let getUserAgendaTool = SlateTool.create(spec, {
  name: 'Get User Agenda',
  key: 'get_user_agenda',
  description: `Retrieve upcoming appointments for a specific user on a schedule. Returns the user's personal agenda of booked appointments.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      scheduleId: z.string().describe('Schedule ID to query'),
      userId: z.string().describe('User ID, username, or foreign key'),
      from: z
        .string()
        .optional()
        .describe('Start date (ISO format). Defaults to current time.'),
      includeSlotInfo: z.boolean().optional().describe('Whether to include slot details')
    })
  )
  .output(
    z.object({
      appointments: z.array(appointmentSchema).describe('Upcoming appointments for the user')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let data = await client.getAgenda(ctx.input.scheduleId, ctx.input.userId, {
      from: ctx.input.from,
      slot: ctx.input.includeSlotInfo
    });

    let appointments = Array.isArray(data) ? data.map(mapAppointmentResponse) : [];

    return {
      output: { appointments },
      message: `Found **${appointments.length}** upcoming appointment(s) for user **${ctx.input.userId}**.`
    };
  })
  .build();

export let createAppointmentTool = SlateTool.create(spec, {
  name: 'Create Appointment',
  key: 'create_appointment',
  description: `Create a new appointment/booking on a schedule. Specify the time slot, optional resource, and booker details.`
})
  .input(
    z.object({
      scheduleId: z.string().describe('Schedule ID to create the appointment on'),
      start: z.string().describe('Start date/time (ISO format YYYY-MM-DD HH:MM:SS)'),
      finish: z
        .string()
        .optional()
        .describe('End date/time (ISO format). If omitted, default duration applies.'),
      userId: z
        .string()
        .optional()
        .describe('User ID, username, or foreign key for the booker'),
      resourceId: z.string().optional().describe('Resource ID to book'),
      slotId: z.string().optional().describe('Slot ID for capacity-type schedules'),
      fullName: z.string().optional().describe('Booker full name'),
      email: z.string().optional().describe('Booker email'),
      phone: z.string().optional().describe('Booker phone'),
      mobile: z.string().optional().describe('Booker mobile'),
      address: z.string().optional().describe('Booker address'),
      country: z.string().optional().describe('Booker country'),
      field1: z.string().optional().describe('Custom field 1'),
      field2: z.string().optional().describe('Custom field 2')
    })
  )
  .output(appointmentSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { scheduleId, userId, ...fields } = ctx.input;

    let bookingData = buildBookingParams(fields);
    let data = await client.createAppointment(scheduleId, bookingData, userId);
    let appointment = mapAppointmentResponse(data);

    return {
      output: appointment,
      message: `Created appointment on schedule **${scheduleId}** starting at **${ctx.input.start}**.`
    };
  })
  .build();

export let updateAppointmentTool = SlateTool.create(spec, {
  name: 'Update Appointment',
  key: 'update_appointment',
  description: `Update an existing appointment's details such as time, resource, or booker information.`
})
  .input(
    z.object({
      appointmentId: z.string().describe('Appointment ID to update'),
      start: z.string().optional().describe('New start date/time'),
      finish: z.string().optional().describe('New end date/time'),
      resourceId: z.string().optional().describe('New resource ID'),
      slotId: z.string().optional().describe('New slot ID'),
      fullName: z.string().optional().describe('Updated booker full name'),
      email: z.string().optional().describe('Updated booker email'),
      phone: z.string().optional().describe('Updated booker phone'),
      mobile: z.string().optional().describe('Updated booker mobile'),
      address: z.string().optional().describe('Updated booker address'),
      country: z.string().optional().describe('Updated booker country'),
      field1: z.string().optional().describe('Custom field 1'),
      field2: z.string().optional().describe('Custom field 2')
    })
  )
  .output(appointmentSchema)
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    let { appointmentId, ...fields } = ctx.input;

    let bookingData = buildBookingParams(fields);
    let data = await client.updateAppointment(appointmentId, bookingData);
    let appointment = mapAppointmentResponse(data);

    return {
      output: appointment,
      message: `Updated appointment **${appointmentId}**.`
    };
  })
  .build();

export let deleteAppointmentTool = SlateTool.create(spec, {
  name: 'Delete Appointment',
  key: 'delete_appointment',
  description: `Delete/cancel an existing appointment by its ID.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      appointmentId: z.string().describe('Appointment ID to delete')
    })
  )
  .output(
    z.object({
      deleted: z.boolean().describe('Whether the appointment was successfully deleted')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client(ctx.auth);
    await client.deleteAppointment(ctx.input.appointmentId);

    return {
      output: { deleted: true },
      message: `Deleted appointment **${ctx.input.appointmentId}**.`
    };
  })
  .build();

let buildBookingParams = (fields: Record<string, any>): Record<string, any> => {
  let params: Record<string, any> = {};
  let fieldMap: Record<string, string> = {
    start: 'start',
    finish: 'finish',
    resourceId: 'resource_id',
    slotId: 'slot_id',
    fullName: 'full_name',
    email: 'email',
    phone: 'phone',
    mobile: 'mobile',
    address: 'address',
    country: 'country',
    field1: 'field_1',
    field2: 'field_2'
  };

  for (let [key, apiKey] of Object.entries(fieldMap)) {
    if (fields[key] !== undefined && fields[key] !== null) {
      params[apiKey!] = fields[key];
    }
  }

  return params;
};

let mapAppointmentResponse = (data: any): any => {
  if (!data) return {};
  return {
    appointmentId: data.id != null ? String(data.id) : undefined,
    start: data.start ?? undefined,
    finish: data.finish ?? undefined,
    resourceName: data.resource ?? undefined,
    resourceId: data.resource_id != null ? String(data.resource_id) : undefined,
    serviceName: data.service ?? undefined,
    serviceId: data.service_id != null ? String(data.service_id) : undefined,
    fullName: data.full_name ?? undefined,
    email: data.email ?? undefined,
    phone: data.phone ?? undefined,
    mobile: data.mobile ?? undefined,
    address: data.address ?? undefined,
    userId: data.user_id != null ? String(data.user_id) : undefined,
    status: data.status ?? undefined,
    price: data.price != null ? String(data.price) : undefined,
    slotId: data.slot_id != null ? String(data.slot_id) : undefined,
    deleted: data.deleted ?? undefined,
    waitlisted: data.waitlisted ?? undefined,
    createdOn: data.created_on ?? undefined,
    updatedOn: data.updated_on ?? undefined
  };
};
