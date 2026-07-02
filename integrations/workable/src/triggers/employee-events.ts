import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { WorkableClient } from '../lib/client';
import { spec } from '../spec';

export let employeeEventsTrigger = SlateTrigger.create(spec, {
  name: 'Employee Events',
  key: 'employee_events',
  description:
    'Triggered when an employee record is created, updated, published, or when onboarding is completed.'
})
  .input(
    z.object({
      eventType: z
        .enum([
          'employee_created',
          'employee_updated',
          'employee_published',
          'onboarding_completed'
        ])
        .describe('Type of employee event'),
      employee: z.any().describe('Employee payload from the webhook')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('Employee ID'),
      name: z.string().optional().describe('Employee full name'),
      firstname: z.string().optional().describe('First name'),
      lastname: z.string().optional().describe('Last name'),
      email: z.string().optional().describe('Personal email'),
      workEmail: z.string().optional().describe('Work email'),
      department: z.string().optional().describe('Department'),
      jobTitle: z.string().optional().describe('Job title'),
      status: z.string().optional().describe('Employee status'),
      startDate: z.string().optional().describe('Start date')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new WorkableClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let subscriptionIds: string[] = [];
      let events = [
        'employee_created',
        'employee_updated',
        'employee_published',
        'onboarding_completed'
      ];

      for (let event of events) {
        let result = await client.createSubscription({
          target: ctx.input.webhookBaseUrl,
          event
        });
        if (result.id) {
          subscriptionIds.push(result.id);
        }
      }

      return {
        registrationDetails: { subscriptionIds }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new WorkableClient({
        token: ctx.auth.token,
        subdomain: ctx.config.subdomain
      });

      let ids = ctx.input.registrationDetails?.subscriptionIds || [];
      for (let subId of ids) {
        try {
          await client.deleteSubscription(subId);
        } catch {
          // Best effort cleanup
        }
      }
    },

    handleRequest: async ctx => {
      let data = (await ctx.request.json()) as any;

      let eventType = data.event || data.type;
      let employee = data.data || data.employee || data;

      return {
        inputs: [
          {
            eventType,
            employee
          }
        ]
      };
    },

    handleEvent: async ctx => {
      let e = ctx.input.employee;
      let eventSuffix = ctx.input.eventType.replace('employee_', '');
      if (ctx.input.eventType === 'onboarding_completed') {
        eventSuffix = 'onboarding_completed';
      }

      return {
        type: `employee.${eventSuffix}`,
        id: `${e.id || e.employee_id}-${ctx.input.eventType}-${Date.now()}`,
        output: {
          employeeId: e.id || e.employee_id,
          name: e.name,
          firstname: e.firstname,
          lastname: e.lastname,
          email: e.email,
          workEmail: e.work_email,
          department: e.department,
          jobTitle: e.job_title,
          status: e.status,
          startDate: e.start_date
        }
      };
    }
  })
  .build();
