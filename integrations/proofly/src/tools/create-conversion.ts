import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createConversion = SlateTool.create(spec, {
  name: 'Create Conversion',
  key: 'create_conversion',
  description: `Add an external lead, conversion, or sale to a Proofly notification. This allows data from third-party systems (e.g., CRM, payment provider) to be reflected in social proof widgets. Use **Get Campaign Notifications** first to obtain the notification ID.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      notificationId: z
        .string()
        .describe('The ID of the notification to add the conversion to'),
      email: z.string().optional().describe('Email address of the lead or customer'),
      firstName: z.string().optional().describe('First name of the lead or customer'),
      lastName: z.string().optional().describe('Last name of the lead or customer'),
      ip: z.string().optional().describe('IP address of the visitor'),
      city: z.string().optional().describe('City for geolocation display'),
      country: z.string().optional().describe('Country for geolocation display'),
      pageUrl: z.string().optional().describe('URL of the page associated with the conversion')
    })
  )
  .output(
    z.object({
      ok: z.boolean().describe('Whether the conversion was successfully created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let conversionData: Record<string, unknown> = {};
    if (ctx.input.email) conversionData.email = ctx.input.email;
    if (ctx.input.firstName) conversionData.firstName = ctx.input.firstName;
    if (ctx.input.lastName) conversionData.lastName = ctx.input.lastName;
    if (ctx.input.ip) conversionData.ip = ctx.input.ip;
    if (ctx.input.city) conversionData.city = ctx.input.city;
    if (ctx.input.country) conversionData.country = ctx.input.country;
    if (ctx.input.pageUrl) conversionData.pageUrl = ctx.input.pageUrl;

    let result = await client.createConversion(ctx.input.notificationId, conversionData);

    return {
      output: {
        ok: result.ok ?? true
      },
      message: `Conversion added to notification \`${ctx.input.notificationId}\`${ctx.input.email ? ` for **${ctx.input.email}**` : ''}.`
    };
  })
  .build();
