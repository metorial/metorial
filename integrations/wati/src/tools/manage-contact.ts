import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customParamSchema = z.object({
  name: z.string().describe('Parameter name.'),
  value: z.string().describe('Parameter value.')
});

let contactOutputSchema = z.object({
  contactId: z.string().optional().describe('Unique contact identifier.'),
  waId: z.string().optional().describe('WhatsApp identifier.'),
  name: z.string().optional().describe('Contact name.'),
  phone: z.string().optional().describe('Phone number.'),
  photo: z.string().optional().describe('Photo URL.'),
  created: z.string().optional().describe('Creation timestamp.'),
  lastUpdated: z.string().optional().describe('Last update timestamp.'),
  contactStatus: z.string().optional().describe('Contact status.'),
  optedIn: z.boolean().optional().describe('Whether the contact opted in.'),
  allowBroadcast: z.boolean().optional().describe('Whether broadcasts are allowed.'),
  teams: z.array(z.string()).optional().describe('Assigned team names.'),
  segments: z.array(z.string()).optional().describe('Associated segments.'),
  customParams: z.array(customParamSchema).optional().describe('Custom parameters.'),
  channelType: z.string().optional().describe('Channel type.')
});

let mapContact = (c: any) => ({
  contactId: c.id,
  waId: c.wa_id,
  name: c.name,
  phone: c.phone,
  photo: c.photo,
  created: c.created,
  lastUpdated: c.last_updated,
  contactStatus: c.contact_status,
  optedIn: c.opted_in,
  allowBroadcast: c.allow_broadcast,
  teams: c.teams,
  segments: c.segments,
  customParams: c.custom_params,
  channelType: c.channel_type
});

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create a new contact, update an existing contact's custom attributes, or retrieve contact details.
Use action "create" to add a new contact, "update" to modify custom parameters, or "get" to fetch contact details.`,
  instructions: [
    'For "create": provide whatsappNumber and contactName. Optionally include customParams.',
    'For "update": provide target (phone number or contact ID) and customParams to update.',
    'For "get": provide target (phone number or contact ID) to retrieve details.'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'get'])
        .describe('The action to perform on the contact.'),
      target: z
        .string()
        .optional()
        .describe(
          'Phone number (with country code), contact ID, or Channel:PhoneNumber. Required for "get" and "update".'
        ),
      whatsappNumber: z
        .string()
        .optional()
        .describe('WhatsApp number with country code. Required for "create".'),
      contactName: z
        .string()
        .optional()
        .describe('Name of the contact. Required for "create".'),
      customParams: z
        .array(customParamSchema)
        .optional()
        .describe('Custom parameter key-value pairs to set on the contact.')
    })
  )
  .output(contactOutputSchema)
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let { action, target, whatsappNumber, contactName, customParams } = ctx.input;

    if (action === 'create') {
      if (!whatsappNumber || !contactName) {
        throw new Error('whatsappNumber and contactName are required for creating a contact.');
      }
      let result = await client.createContact({
        whatsappNumber,
        name: contactName,
        customParams
      });
      return {
        output: mapContact(result),
        message: `Contact **${contactName}** (${whatsappNumber}) created.`
      };
    }

    if (action === 'update') {
      if (!target) {
        throw new Error('target is required for updating a contact.');
      }
      let result = await client.updateContacts([{ target, customParams }]);
      let updatedContact = result?.contact_list?.[0];
      return {
        output: updatedContact ? mapContact(updatedContact) : { contactId: target },
        message: `Contact **${target}** updated.`
      };
    }

    if (action === 'get') {
      if (!target) {
        throw new Error('target is required for getting a contact.');
      }
      let result = await client.getContact(target);
      return {
        output: mapContact(result),
        message: `Retrieved contact details for **${target}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
