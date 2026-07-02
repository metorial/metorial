import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let appointmentEvent = SlateTrigger.create(spec, {
  name: 'Appointment Event',
  key: 'appointment_event',
  description:
    'Triggers when an appointment is created, modified, or deleted in eTermin via the Web Push webhook.'
})
  .input(
    z.object({
      command: z.enum(['CREATED', 'MODIFIED', 'DELETED']).describe('The event command type'),
      appointmentUid: z.string().describe('Unique identifier for the appointment'),
      startDateTimeUtc: z
        .string()
        .optional()
        .describe('Start date/time in UTC (yyyyMMdd HHmmss)'),
      endDateTimeUtc: z.string().optional().describe('End date/time in UTC (yyyyMMdd HHmmss)'),
      startDateTime: z
        .string()
        .optional()
        .describe('Start date/time in local timezone (yyyyMMdd HHmmss)'),
      endDateTime: z
        .string()
        .optional()
        .describe('End date/time in local timezone (yyyyMMdd HHmmss)'),
      bookingDateUtc: z.string().optional().describe('Booking date in UTC (yyyyMMdd HHmmss)'),
      salutation: z.string().optional().describe('Customer salutation'),
      lastName: z.string().optional().describe('Customer last name'),
      firstName: z.string().optional().describe('Customer first name'),
      email: z.string().optional().describe('Customer email'),
      phone: z.string().optional().describe('Customer phone'),
      street: z.string().optional().describe('Customer street address'),
      zip: z.string().optional().describe('Customer postal code'),
      town: z.string().optional().describe('Customer city/town'),
      birthday: z.string().optional().describe('Customer birthday'),
      notes: z.string().optional().describe('Appointment notes'),
      customerNumber: z.string().optional().describe('Customer number'),
      calendarName: z.string().optional().describe('Calendar name'),
      calendarId: z.string().optional().describe('Calendar ID'),
      serviceName: z.string().optional().describe('Service name'),
      serviceUid: z.string().optional().describe('Service unique identifier'),
      selectedAnswers: z
        .string()
        .optional()
        .describe('Selected answers to custom booking questions'),
      bookingLanguage: z.string().optional().describe('Booking language'),
      additional1: z.string().optional().describe('Custom field 1'),
      additional2: z.string().optional().describe('Custom field 2'),
      additional3: z.string().optional().describe('Custom field 3'),
      additional4: z.string().optional().describe('Custom field 4'),
      additional5: z.string().optional().describe('Custom field 5'),
      additional6: z.string().optional().describe('Custom field 6')
    })
  )
  .output(
    z.object({
      appointmentUid: z.string().describe('Unique identifier for the appointment'),
      startDateTimeUtc: z.string().optional().describe('Start date/time in UTC'),
      endDateTimeUtc: z.string().optional().describe('End date/time in UTC'),
      startDateTime: z.string().optional().describe('Start date/time in local timezone'),
      endDateTime: z.string().optional().describe('End date/time in local timezone'),
      bookingDateUtc: z.string().optional().describe('Booking date in UTC'),
      salutation: z.string().optional().describe('Customer salutation'),
      lastName: z.string().optional().describe('Customer last name'),
      firstName: z.string().optional().describe('Customer first name'),
      email: z.string().optional().describe('Customer email'),
      phone: z.string().optional().describe('Customer phone'),
      street: z.string().optional().describe('Customer street address'),
      zip: z.string().optional().describe('Customer postal code'),
      town: z.string().optional().describe('Customer city/town'),
      birthday: z.string().optional().describe('Customer birthday'),
      notes: z.string().optional().describe('Appointment notes'),
      customerNumber: z.string().optional().describe('Customer number'),
      calendarName: z.string().optional().describe('Calendar name'),
      calendarId: z.string().optional().describe('Calendar ID'),
      serviceName: z.string().optional().describe('Service name'),
      serviceUid: z.string().optional().describe('Service unique identifier'),
      selectedAnswers: z.string().optional().describe('Custom booking question answers'),
      bookingLanguage: z.string().optional().describe('Language used during booking'),
      additional1: z.string().optional().describe('Custom field 1'),
      additional2: z.string().optional().describe('Custom field 2'),
      additional3: z.string().optional().describe('Custom field 3'),
      additional4: z.string().optional().describe('Custom field 4'),
      additional5: z.string().optional().describe('Custom field 5'),
      additional6: z.string().optional().describe('Custom field 6')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let contentType = ctx.request.headers.get('content-type') ?? '';
      let data: Record<string, string>;

      if (contentType.includes('application/json')) {
        data = (await ctx.request.json()) as Record<string, string>;
      } else {
        let text = await ctx.request.text();
        let params = new URLSearchParams(text);
        data = Object.fromEntries(params.entries());
      }

      let command = (data.COMMAND ?? data.command ?? '') as 'CREATED' | 'MODIFIED' | 'DELETED';
      let appointmentUid = data.APPOINTMENTUID ?? data.appointmentuid ?? '';

      if (!command || !appointmentUid) {
        return { inputs: [] };
      }

      return {
        inputs: [
          {
            command,
            appointmentUid,
            startDateTimeUtc: data.STARTDATETIMEUTC ?? data.startdatetimeutc,
            endDateTimeUtc: data.ENDDATETIMEUTC ?? data.enddatetimeutc,
            startDateTime: data.STARTDATETIME ?? data.startdatetime,
            endDateTime: data.ENDDATETIME ?? data.enddatetime,
            bookingDateUtc: data.BOOKINGDATEUTC ?? data.bookingdateutc,
            salutation: data.SALUTATION ?? data.salutation,
            lastName: data.LASTNAME ?? data.lastname,
            firstName: data.FIRSTNAME ?? data.firstname,
            email: data.EMAIL ?? data.email,
            phone: data.PHONE ?? data.phone,
            street: data.STREET ?? data.street,
            zip: data.ZIP ?? data.zip,
            town: data.TOWN ?? data.town,
            birthday: data.BIRTHDAY ?? data.birthday,
            notes: data.NOTES ?? data.notes,
            customerNumber: data.CUSTOMERNUMBER ?? data.customernumber,
            calendarName: data.CALENDARNAME ?? data.calendarname,
            calendarId: data.CALENDARID ?? data.calendarid,
            serviceName: data.SERVICENAME ?? data.servicename,
            serviceUid: data.SERVICEUID ?? data.serviceuid,
            selectedAnswers: data.SELECTEDANSWERS ?? data.selectedanswers,
            bookingLanguage: data.BOOKINGLANGUAGE ?? data.bookinglanguage,
            additional1: data.ADDITIONAL1 ?? data.additional1,
            additional2: data.ADDITIONAL2 ?? data.additional2,
            additional3: data.ADDITIONAL3 ?? data.additional3,
            additional4: data.ADDITIONAL4 ?? data.additional4,
            additional5: data.ADDITIONAL5 ?? data.additional5,
            additional6: data.ADDITIONAL6 ?? data.additional6
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let commandMap: Record<string, string> = {
        CREATED: 'appointment.created',
        MODIFIED: 'appointment.modified',
        DELETED: 'appointment.deleted'
      };

      let eventType =
        commandMap[ctx.input.command] ?? `appointment.${ctx.input.command.toLowerCase()}`;

      return {
        type: eventType,
        id: `${ctx.input.appointmentUid}-${ctx.input.command}-${ctx.input.startDateTimeUtc ?? Date.now()}`,
        output: {
          appointmentUid: ctx.input.appointmentUid,
          startDateTimeUtc: ctx.input.startDateTimeUtc,
          endDateTimeUtc: ctx.input.endDateTimeUtc,
          startDateTime: ctx.input.startDateTime,
          endDateTime: ctx.input.endDateTime,
          bookingDateUtc: ctx.input.bookingDateUtc,
          salutation: ctx.input.salutation,
          lastName: ctx.input.lastName,
          firstName: ctx.input.firstName,
          email: ctx.input.email,
          phone: ctx.input.phone,
          street: ctx.input.street,
          zip: ctx.input.zip,
          town: ctx.input.town,
          birthday: ctx.input.birthday,
          notes: ctx.input.notes,
          customerNumber: ctx.input.customerNumber,
          calendarName: ctx.input.calendarName,
          calendarId: ctx.input.calendarId,
          serviceName: ctx.input.serviceName,
          serviceUid: ctx.input.serviceUid,
          selectedAnswers: ctx.input.selectedAnswers,
          bookingLanguage: ctx.input.bookingLanguage,
          additional1: ctx.input.additional1,
          additional2: ctx.input.additional2,
          additional3: ctx.input.additional3,
          additional4: ctx.input.additional4,
          additional5: ctx.input.additional5,
          additional6: ctx.input.additional6
        }
      };
    }
  })
  .build();
