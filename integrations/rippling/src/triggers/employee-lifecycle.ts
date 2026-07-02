import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { RipplingClient } from '../lib/client';
import { spec } from '../spec';

export let employeeLifecycle = SlateTrigger.create(spec, {
  name: 'Employee Lifecycle Events',
  key: 'employee_lifecycle',
  description:
    'Receives webhook events for employee lifecycle actions including account creation, invitation, deletion, suspension, and password resets. Webhooks are configured at the app listing level in the Rippling App Shop.'
})
  .input(
    z.object({
      eventType: z
        .string()
        .describe(
          'Webhook event type (e.g. EXTERNAL_ACCOUNT_CREATE, EXTERNAL_ACCOUNT_DELETE)'
        ),
      eventId: z.string().describe('Unique event identifier'),
      employeeId: z.string().optional().describe('Employee/role ID affected by the event'),
      employeeData: z
        .any()
        .optional()
        .describe('Employee data included in the webhook payload')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('Employee/role ID affected by the event'),
      name: z.string().optional().describe('Employee full name'),
      workEmail: z.string().optional().describe('Employee work email'),
      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      title: z.string().optional().describe('Job title'),
      department: z.string().optional().describe('Department'),
      roleState: z.string().optional().describe('Role state'),
      uniqueId: z.string().optional().describe('Permanent unique profile number'),
      startDate: z.string().optional().describe('Start date'),
      endDate: z.string().optional().describe('End date')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      // Rippling webhook payloads can come in different formats.
      // The webhook typically sends employee data with an event type indicator.
      let events: Array<{
        eventType: string;
        eventId: string;
        employeeId?: string;
        employeeData?: any;
      }> = [];

      if (Array.isArray(data)) {
        // Array of events
        for (let item of data) {
          events.push({
            eventType: item.event_type || item.eventType || item.type || 'unknown',
            eventId:
              item.event_id || item.eventId || item.id || `${Date.now()}-${Math.random()}`,
            employeeId:
              item.employee_id || item.employeeId || item.roleId || item.role || item.id,
            employeeData: item.employee || item.data || item
          });
        }
      } else if (data && typeof data === 'object') {
        // Single event
        events.push({
          eventType: data.event_type || data.eventType || data.type || 'unknown',
          eventId:
            data.event_id || data.eventId || data.id || `${Date.now()}-${Math.random()}`,
          employeeId:
            data.employee_id || data.employeeId || data.roleId || data.role || data.id,
          employeeData: data.employee || data.data || data
        });
      }

      return {
        inputs: events
      };
    },

    handleEvent: async ctx => {
      let emp = ctx.input.employeeData || {};
      let employeeId = ctx.input.employeeId || emp.id || emp.roleId || '';

      // If we have a token and an employee ID but incomplete data, try fetching full employee data
      if (employeeId && ctx.auth?.token && !emp.name && !emp.workEmail) {
        try {
          let client = new RipplingClient({ token: ctx.auth.token });
          let fullEmployee = await client.getEmployee(employeeId);
          emp = { ...emp, ...fullEmployee };
        } catch {
          // Continue with whatever data we have
        }
      }

      let eventType = ctx.input.eventType
        .toLowerCase()
        .replace(/^external_account_/, 'employee.');
      if (!eventType.includes('.')) {
        eventType = `employee.${eventType}`;
      }

      return {
        type: eventType,
        id: ctx.input.eventId,
        output: {
          employeeId,
          name: emp.name,
          workEmail: emp.workEmail,
          firstName: emp.firstName,
          lastName: emp.lastName,
          title: emp.title,
          department: emp.department,
          roleState: emp.roleState,
          uniqueId: emp.uniqueId,
          startDate: emp.startDate,
          endDate: emp.endDate
        }
      };
    }
  })
  .build();
