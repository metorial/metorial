import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let manageContactAutomation = SlateTool.create(spec, {
  name: 'Manage Contact Automation',
  key: 'manage_contact_automation',
  description: `Adds a contact to an automation or removes them from one. When removing, provide the contactAutomation ID (available from Get Contact).`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['add', 'remove'])
        .describe('Whether to add or remove the contact from the automation'),
      contactId: z.string().describe('ID of the contact'),
      automationId: z
        .string()
        .optional()
        .describe('ID of the automation (required when adding)'),
      contactAutomationId: z
        .string()
        .optional()
        .describe('ID of the contactAutomation association (required when removing)')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      contactAutomationId: z
        .string()
        .optional()
        .describe('ID of the contact-automation association')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiUrl: ctx.config.apiUrl
    });

    if (ctx.input.action === 'add') {
      if (!ctx.input.automationId) {
        throw new Error('automationId is required when adding a contact to an automation');
      }
      let result = await client.addContactToAutomation(
        ctx.input.contactId,
        ctx.input.automationId
      );
      return {
        output: {
          success: true,
          contactAutomationId: result.contactAutomation?.id
        },
        message: `Contact (ID: ${ctx.input.contactId}) added to automation (ID: ${ctx.input.automationId}).`
      };
    } else {
      if (!ctx.input.contactAutomationId) {
        throw new Error(
          'contactAutomationId is required when removing a contact from an automation'
        );
      }
      await client.removeContactFromAutomation(ctx.input.contactAutomationId);
      return {
        output: { success: true },
        message: `Contact (ID: ${ctx.input.contactId}) removed from automation.`
      };
    }
  })
  .build();
