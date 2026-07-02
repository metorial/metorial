import { SlateTool } from 'slates';
import { z } from 'zod';
import { ImportClient } from '../lib/client';
import { spec } from '../spec';

export let upsertContact = SlateTool.create(spec, {
  name: 'Create or Update Contact',
  key: 'upsert_contact',
  description: `Creates a new contact or updates an existing one in a SegMetrics integration. Contacts are matched by **contact_id** (priority) or **email**.
Supports setting name, status, UTM parameters, geographic data, custom fields, and tags.
When updating custom fields, values are appended to existing data — set a value to \`null\` to remove it.
When tags are provided here, they **replace** existing tags. Use the dedicated tag tools to add/remove tags incrementally.`,
  instructions: [
    'Provide either contactId or email (or both) to identify the contact.',
    'All amounts and dates should be strings in the format "YYYY-MM-DD HH:MM:SS".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z
        .string()
        .optional()
        .describe('Unique identifier for the contact in your system.'),
      email: z.string().optional().describe('Email address of the contact.'),
      firstName: z.string().optional().describe('First name of the contact.'),
      lastName: z.string().optional().describe('Last name of the contact.'),
      status: z.string().optional().describe('Contact status, e.g. "active".'),
      dateCreated: z
        .string()
        .optional()
        .describe('Date the contact was created (YYYY-MM-DD HH:MM:SS).'),
      lastUpdated: z
        .string()
        .optional()
        .describe('Date the contact was last updated (YYYY-MM-DD HH:MM:SS).'),
      utmSource: z.string().optional().describe('UTM source parameter.'),
      utmMedium: z.string().optional().describe('UTM medium parameter.'),
      utmCampaign: z.string().optional().describe('UTM campaign parameter.'),
      utmContent: z.string().optional().describe('UTM content parameter.'),
      utmTerm: z.string().optional().describe('UTM term parameter.'),
      referringUrl: z.string().optional().describe('The referring URL.'),
      optinUrl: z.string().optional().describe('The opt-in URL.'),
      ipAddress: z.string().optional().describe('IP address of the contact.'),
      affiliateId: z.string().optional().describe('Affiliate identifier.'),
      geoLat: z.number().optional().describe('Geographic latitude.'),
      geoLon: z.number().optional().describe('Geographic longitude.'),
      tags: z
        .array(
          z.union([
            z.string(),
            z.object({
              id: z.string().optional(),
              name: z.string().optional(),
              date: z.string().optional()
            })
          ])
        )
        .optional()
        .describe('Tags to set on the contact. Replaces existing tags.'),
      customFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Custom fields as key-value pairs. Set a value to null to remove it.')
    })
  )
  .output(
    z.object({
      success: z.boolean().describe('Whether the operation was successful.'),
      response: z.unknown().optional().describe('Raw API response.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ImportClient({
      token: ctx.auth.token,
      accountId: ctx.config.accountId,
      integrationId: ctx.config.integrationId!
    });

    let body: Record<string, unknown> = {};

    if (ctx.input.contactId) body.contact_id = ctx.input.contactId;
    if (ctx.input.email) body.email = ctx.input.email;
    if (ctx.input.firstName) body.first_name = ctx.input.firstName;
    if (ctx.input.lastName) body.last_name = ctx.input.lastName;
    if (ctx.input.status) body.status = ctx.input.status;
    if (ctx.input.dateCreated) body.date_created = ctx.input.dateCreated;
    if (ctx.input.lastUpdated) body.last_updated = ctx.input.lastUpdated;
    if (ctx.input.utmSource) body.utm_source = ctx.input.utmSource;
    if (ctx.input.utmMedium) body.utm_medium = ctx.input.utmMedium;
    if (ctx.input.utmCampaign) body.utm_campaign = ctx.input.utmCampaign;
    if (ctx.input.utmContent) body.utm_content = ctx.input.utmContent;
    if (ctx.input.utmTerm) body.utm_term = ctx.input.utmTerm;
    if (ctx.input.referringUrl) body.referring_url = ctx.input.referringUrl;
    if (ctx.input.optinUrl) body.optin_url = ctx.input.optinUrl;
    if (ctx.input.ipAddress) body.ip_address = ctx.input.ipAddress;
    if (ctx.input.affiliateId) body.affiliate_id = ctx.input.affiliateId;
    if (ctx.input.geoLat !== undefined) body.geo_lat = ctx.input.geoLat;
    if (ctx.input.geoLon !== undefined) body.geo_lon = ctx.input.geoLon;
    if (ctx.input.tags) body.tags = ctx.input.tags;
    if (ctx.input.customFields) body.custom_fields = ctx.input.customFields;

    let response = await client.upsertContact(body);

    let identifier = ctx.input.email || ctx.input.contactId || 'unknown';
    return {
      output: {
        success: true,
        response
      },
      message: `Contact **${identifier}** has been created or updated successfully.`
    };
  })
  .build();
