import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createLead = SlateTool.create(spec, {
  name: 'Create Lead',
  key: 'create_lead',
  description: `Create a new lead in the directory. Supports auto-matching to members and auto-geocoding of locations.
Can optionally send lead email notifications to matched members.`
})
  .input(
    z.object({
      leadName: z.string().optional().describe('Name of the lead.'),
      leadEmail: z.string().optional().describe('Email address of the lead.'),
      leadPhone: z.string().optional().describe('Phone number of the lead.'),
      leadLocation: z.string().optional().describe('Location of the lead.'),
      leadMessage: z.string().optional().describe('Message from the lead.'),
      topCategoryName: z.string().optional().describe('Top-level category name for the lead.'),
      subCategoryName: z.string().optional().describe('Sub-category name for the lead.'),
      autoMatch: z
        .boolean()
        .optional()
        .describe('Whether to automatically match the lead to members.'),
      autoGeocode: z
        .boolean()
        .optional()
        .describe('Whether to automatically geocode the lead location.'),
      usersToMatch: z
        .string()
        .optional()
        .describe('Comma-separated member IDs or emails to match with this lead.'),
      sendLeadEmailNotification: z
        .boolean()
        .optional()
        .describe('Whether to send email notifications to matched members.'),
      originIp: z.string().optional().describe('IP address of the lead origin.'),
      additionalFields: z
        .record(z.string(), z.string())
        .optional()
        .describe('Any additional fields as key-value pairs.')
    })
  )
  .output(
    z.object({
      status: z.string().describe('Response status from the API.'),
      lead: z.any().describe('The newly created lead record.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      token: ctx.auth.token,
      websiteDomain: ctx.config.websiteDomain
    });

    let data: Record<string, any> = {};
    if (ctx.input.leadName) data.lead_name = ctx.input.leadName;
    if (ctx.input.leadEmail) data.lead_email = ctx.input.leadEmail;
    if (ctx.input.leadPhone) data.lead_phone = ctx.input.leadPhone;
    if (ctx.input.leadLocation) data.lead_location = ctx.input.leadLocation;
    if (ctx.input.leadMessage) data.lead_message = ctx.input.leadMessage;
    if (ctx.input.topCategoryName) data.top_category_name = ctx.input.topCategoryName;
    if (ctx.input.subCategoryName) data.sub_category_name = ctx.input.subCategoryName;
    if (ctx.input.autoMatch !== undefined) data.auto_match = ctx.input.autoMatch ? '1' : '0';
    if (ctx.input.autoGeocode !== undefined)
      data.auto_geocode = ctx.input.autoGeocode ? '1' : '0';
    if (ctx.input.usersToMatch) data.users_to_match = ctx.input.usersToMatch;
    if (ctx.input.sendLeadEmailNotification !== undefined)
      data.send_lead_email_notification = ctx.input.sendLeadEmailNotification ? '1' : '0';
    if (ctx.input.originIp) data.origin_ip = ctx.input.originIp;
    if (ctx.input.additionalFields) {
      for (let [key, value] of Object.entries(ctx.input.additionalFields)) {
        data[key] = value;
      }
    }

    let result = await client.createLead(data);

    return {
      output: {
        status: result.status,
        lead: result.message
      },
      message: `Created new lead${ctx.input.leadName ? ` **${ctx.input.leadName}**` : ''}.`
    };
  })
  .build();
