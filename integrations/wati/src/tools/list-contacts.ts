import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let customParamSchema = z.object({
  name: z.string().describe('Parameter name.'),
  value: z.string().describe('Parameter value.')
});

let contactSchema = z.object({
  contactId: z.string().optional().describe('Unique contact identifier.'),
  waId: z.string().optional().describe('WhatsApp identifier.'),
  name: z.string().optional().describe('Contact name.'),
  phone: z.string().optional().describe('Phone number.'),
  photo: z.string().optional().describe('Photo URL.'),
  created: z.string().optional().describe('Creation timestamp.'),
  lastUpdated: z.string().optional().describe('Last update timestamp.'),
  contactStatus: z.string().optional().describe('Current contact status.'),
  source: z.string().optional().describe('Origin source.'),
  optedIn: z.boolean().optional().describe('Whether the contact opted in.'),
  allowBroadcast: z.boolean().optional().describe('Whether broadcasts are allowed.'),
  teams: z.array(z.string()).optional().describe('Assigned team names.'),
  segments: z.array(z.string()).optional().describe('Associated segments.'),
  customParams: z.array(customParamSchema).optional().describe('Custom parameters.'),
  channelType: z.string().optional().describe('Channel type (whatsapp, instagram, messenger).')
});

export let listContacts = SlateTool.create(spec, {
  name: 'List Contacts',
  key: 'list_contacts',
  description: `Retrieve a paginated list of contacts stored in Wati. Returns contact details including name, phone number, status, custom parameters, and team assignments.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      pageNumber: z.number().int().min(1).default(1).describe('Page number (1-based).'),
      pageSize: z
        .number()
        .int()
        .min(1)
        .max(100)
        .default(50)
        .describe('Number of contacts per page (max 100).')
    })
  )
  .output(
    z.object({
      contacts: z.array(contactSchema).describe('List of contacts.'),
      pageNumber: z.number().optional().describe('Current page number.'),
      pageSize: z.number().optional().describe('Items per page.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      apiEndpoint: ctx.config.apiEndpoint
    });

    let result = await client.listContacts({
      pageNumber: ctx.input.pageNumber,
      pageSize: ctx.input.pageSize
    });

    let contacts = (result?.contact_list || []).map((c: any) => ({
      contactId: c.id,
      waId: c.wa_id,
      name: c.name,
      phone: c.phone,
      photo: c.photo,
      created: c.created,
      lastUpdated: c.last_updated,
      contactStatus: c.contact_status,
      source: c.source,
      optedIn: c.opted_in,
      allowBroadcast: c.allow_broadcast,
      teams: c.teams,
      segments: c.segments,
      customParams: c.custom_params,
      channelType: c.channel_type
    }));

    return {
      output: {
        contacts,
        pageNumber: result?.page_number,
        pageSize: result?.page_size
      },
      message: `Retrieved **${contacts.length}** contacts (page ${ctx.input.pageNumber}).`
    };
  })
  .build();
