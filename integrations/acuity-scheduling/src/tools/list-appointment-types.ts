import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let listAppointmentTypes = SlateTool.create(spec, {
  name: 'List Appointment Types',
  key: 'list_appointment_types',
  description: `Retrieve all configured appointment types (service offerings) including their duration, pricing, and associated calendars. Also returns available add-ons.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      appointmentTypes: z
        .array(
          z.object({
            appointmentTypeId: z.number().describe('Appointment type ID'),
            name: z.string().describe('Appointment type name'),
            description: z.string().optional().describe('Description'),
            duration: z.number().describe('Duration in minutes'),
            price: z.string().describe('Price'),
            category: z.string().optional().describe('Category name'),
            color: z.string().optional().describe('Calendar color'),
            private: z.boolean().optional().describe('Whether the type is private'),
            calendarIds: z.array(z.number()).optional().describe('Associated calendar IDs')
          })
        )
        .describe('List of appointment types'),
      addons: z
        .array(
          z.object({
            addonId: z.number().describe('Add-on ID'),
            name: z.string().describe('Add-on name'),
            duration: z.number().optional().describe('Additional duration in minutes'),
            price: z.string().optional().describe('Add-on price')
          })
        )
        .describe('List of appointment add-ons')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      authMethod: ctx.auth.authMethod
    });

    let [types, addons] = await Promise.all([
      client.listAppointmentTypes(),
      client.listAppointmentAddons()
    ]);

    let appointmentTypes = (types as any[]).map((t: any) => ({
      appointmentTypeId: t.id,
      name: t.name || '',
      description: t.description || undefined,
      duration: t.duration || 0,
      price: t.price || '0',
      category: t.category || undefined,
      color: t.color || undefined,
      private: t.private || undefined,
      calendarIds: t.calendarIDs || undefined
    }));

    let addonList = (addons as any[]).map((a: any) => ({
      addonId: a.id,
      name: a.name || '',
      duration: a.duration || undefined,
      price: a.price || undefined
    }));

    return {
      output: { appointmentTypes, addons: addonList },
      message: `Found **${appointmentTypes.length}** appointment type(s) and **${addonList.length}** add-on(s).`
    };
  })
  .build();
