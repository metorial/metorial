import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let notificationTargetSchema = z
  .object({
    email: z
      .array(
        z.object({
          address: z.string().describe('Email address'),
          severity: z.enum(['HIGH', 'LOW']).describe('Alert severity level')
        })
      )
      .optional()
      .describe('Email notification targets'),
    sms: z
      .array(
        z.object({
          number: z.string().describe('Phone number'),
          countryCode: z.string().describe('Country code (e.g. "1" for US)'),
          severity: z.enum(['HIGH', 'LOW']).describe('Alert severity level'),
          provider: z
            .enum(['nexmo', 'bulksms', 'esendex', 'cellsynt'])
            .optional()
            .describe('SMS provider')
        })
      )
      .optional()
      .describe('SMS notification targets')
  })
  .describe('Notification targets for the contact');

let contactOutputSchema = z.object({
  contactId: z.number().describe('Contact ID'),
  name: z.string().optional().describe('Contact name'),
  paused: z.boolean().optional().describe('Whether contact is paused'),
  type: z.string().optional().describe('Contact type'),
  notificationTargets: z.any().optional().describe('Notification targets'),
  teams: z
    .array(
      z.object({
        teamId: z.number(),
        name: z.string().optional()
      })
    )
    .optional()
    .describe('Teams the contact belongs to')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Alerting Contacts',
  key: 'list_contacts',
  description: `Lists all alerting contacts configured in your Pingdom account. Contacts receive notifications when checks change state.`,
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      contacts: z.array(contactOutputSchema).describe('List of alerting contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.listContacts();
    let contacts = (result.contacts || []).map((c: any) => ({
      contactId: c.id,
      name: c.name,
      paused: c.paused,
      type: c.type,
      notificationTargets: c.notification_targets,
      teams: c.teams?.map((t: any) => ({ teamId: t.id, name: t.name }))
    }));

    return {
      output: { contacts },
      message: `Found **${contacts.length}** alerting contact(s).`
    };
  })
  .build();

export let createContact = SlateTool.create(spec, {
  name: 'Create Alerting Contact',
  key: 'create_contact',
  description: `Creates a new alerting contact that can receive notifications when checks change state. Supports email and SMS notification targets.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      name: z.string().describe('Name of the contact'),
      paused: z.boolean().optional().describe('Create contact in paused state'),
      notificationTargets: notificationTargetSchema
    })
  )
  .output(
    z.object({
      contactId: z.number().describe('ID of the created contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let data: Record<string, any> = {
      name: ctx.input.name
    };

    if (ctx.input.paused !== undefined) data.paused = ctx.input.paused;

    let notifTargets: Record<string, any> = {};
    if (ctx.input.notificationTargets.email?.length) {
      notifTargets.email = ctx.input.notificationTargets.email;
    }
    if (ctx.input.notificationTargets.sms?.length) {
      notifTargets.sms = ctx.input.notificationTargets.sms.map(s => ({
        number: s.number,
        country_code: s.countryCode,
        severity: s.severity,
        provider: s.provider
      }));
    }
    data.notification_targets = notifTargets;

    let result = await client.createContact(data);
    let contact = result.contact || result;

    return {
      output: { contactId: contact.id },
      message: `Created alerting contact **${ctx.input.name}** (ID: ${contact.id}).`
    };
  })
  .build();

export let updateContact = SlateTool.create(spec, {
  name: 'Update Alerting Contact',
  key: 'update_contact',
  description: `Updates an existing alerting contact's name, paused state, or notification targets.`,
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to update'),
      name: z.string().optional().describe('New contact name'),
      paused: z.boolean().optional().describe('Pause or unpause the contact'),
      notificationTargets: notificationTargetSchema.optional()
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let data: Record<string, any> = {};
    if (ctx.input.name !== undefined) data.name = ctx.input.name;
    if (ctx.input.paused !== undefined) data.paused = ctx.input.paused;

    if (ctx.input.notificationTargets) {
      let notifTargets: Record<string, any> = {};
      if (ctx.input.notificationTargets.email?.length) {
        notifTargets.email = ctx.input.notificationTargets.email;
      }
      if (ctx.input.notificationTargets.sms?.length) {
        notifTargets.sms = ctx.input.notificationTargets.sms.map(s => ({
          number: s.number,
          country_code: s.countryCode,
          severity: s.severity,
          provider: s.provider
        }));
      }
      data.notification_targets = notifTargets;
    }

    let result = await client.updateContact(ctx.input.contactId, data);

    return {
      output: { message: result.message || 'Contact updated successfully' },
      message: `Updated alerting contact **${ctx.input.contactId}**.`
    };
  })
  .build();

export let deleteContact = SlateTool.create(spec, {
  name: 'Delete Alerting Contact',
  key: 'delete_contact',
  description: `Permanently deletes an alerting contact. This action cannot be undone.`,
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      contactId: z.number().describe('ID of the contact to delete')
    })
  )
  .output(
    z.object({
      message: z.string().describe('Confirmation message')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      accountEmail: ctx.auth.accountEmail
    });

    let result = await client.deleteContact(ctx.input.contactId);

    return {
      output: { message: result.message || 'Contact deleted successfully' },
      message: `Deleted alerting contact **${ctx.input.contactId}**.`
    };
  })
  .build();
