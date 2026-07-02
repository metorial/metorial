import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let employeeChanged = SlateTrigger.create(spec, {
  name: 'Employee Data Changed',
  key: 'employee_changed',
  description:
    'Triggers when employee data is created, updated, or deleted in BambooHR. Uses webhooks registered via the Permissioned Webhooks API to receive real-time notifications about employee changes.'
})
  .input(
    z.object({
      action: z
        .enum(['Created', 'Updated', 'Deleted'])
        .describe('The type of change that occurred'),
      employeeId: z.string().describe('The employee ID that was changed'),
      changedFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields that changed and their new values (for Updated action)'),
      employeeFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Employee fields included in the webhook payload')
    })
  )
  .output(
    z.object({
      employeeId: z.string().describe('The employee ID that was affected'),
      action: z
        .string()
        .describe('The action that triggered the event: created, updated, or deleted'),
      changedFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Fields that were changed (for updates)'),
      employeeFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('Current employee field values from the webhook')
    })
  )
  .webhook({
    autoRegisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        companyDomain: ctx.config.companyDomain
      });

      // Get available monitor fields for the webhook
      let monitorFieldsData = await client.getWebhookMonitorFields();
      let monitorFields: string[] = [];

      // Use common important fields for monitoring
      if (Array.isArray(monitorFieldsData)) {
        monitorFields = monitorFieldsData.map((f: any) => f.id || f.name || f).filter(Boolean);
      } else if (monitorFieldsData && typeof monitorFieldsData === 'object') {
        monitorFields = Object.keys(monitorFieldsData);
      }

      // If we couldn't discover fields, use common defaults
      if (monitorFields.length === 0) {
        monitorFields = [
          'firstName',
          'lastName',
          'workEmail',
          'jobTitle',
          'department',
          'division',
          'location',
          'status',
          'hireDate',
          'terminationDate',
          'supervisorEId'
        ];
      }

      // Create postFields mapping: field name -> field name (keep original names)
      let postFields: Record<string, string> = {};
      for (let field of monitorFields) {
        postFields[field] = field;
      }

      let result = await client.createWebhook({
        name: 'Slates Employee Changed Webhook',
        monitorFields: monitorFields.slice(0, 50), // Limit to prevent overly large webhook configs
        postFields,
        url: ctx.input.webhookBaseUrl,
        format: 'json',
        includeCompanyDomain: true
      });

      return {
        registrationDetails: {
          webhookId: String(result?.id || result?.webhookId || ''),
          privateKey: result?.privateKey || ''
        }
      };
    },

    autoUnregisterWebhook: async ctx => {
      let client = new Client({
        token: ctx.auth.token,
        companyDomain: ctx.config.companyDomain
      });

      let webhookId = ctx.input.registrationDetails?.webhookId;
      if (webhookId) {
        await client.deleteWebhook(webhookId);
      }
    },

    handleRequest: async ctx => {
      let data: any;
      try {
        data = await ctx.request.json();
      } catch {
        return { inputs: [] };
      }

      if (!data?.employees) {
        return { inputs: [] };
      }

      let inputs: Array<{
        action: 'Created' | 'Updated' | 'Deleted';
        employeeId: string;
        changedFields?: Record<string, any>;
        employeeFields?: Record<string, any>;
      }> = [];

      // BambooHR webhook payload has employees array with changes
      for (let employee of data.employees) {
        let employeeId = String(employee.id || '');
        let action = employee.action || data.action || 'Updated';
        let changedFields = employee.changedFields || {};
        let employeeFields = employee.fields || {};

        if (employeeId) {
          inputs.push({
            action,
            employeeId,
            changedFields: Object.keys(changedFields).length > 0 ? changedFields : undefined,
            employeeFields: Object.keys(employeeFields).length > 0 ? employeeFields : undefined
          });
        }
      }

      return { inputs };
    },

    handleEvent: async ctx => {
      let actionLower = ctx.input.action.toLowerCase();
      let eventId = `employee_${ctx.input.employeeId}_${actionLower}_${Date.now()}`;

      return {
        type: `employee.${actionLower}`,
        id: eventId,
        output: {
          employeeId: ctx.input.employeeId,
          action: actionLower,
          changedFields: ctx.input.changedFields,
          employeeFields: ctx.input.employeeFields
        }
      };
    }
  })
  .build();
