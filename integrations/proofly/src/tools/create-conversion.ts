import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let createConversion = SlateTool.create(spec, {
  name: 'Create Conversion',
  key: 'create_conversion',
  description: `Submit an external conversion using the existing notification conversion endpoint. This compatibility endpoint is absent from the current public API reference. Use **Get Campaign Notifications** first to obtain the notification ID.`,
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

    let { notificationId, ...fields } = ctx.input;
    let conversionData = pickDefined(fields);

    let result = await client.createConversion(notificationId, conversionData);

    return {
      output: {
        ok: result.ok
      },
      message: `Conversion added to notification \`${ctx.input.notificationId}\`${ctx.input.email ? ` for **${ctx.input.email}**` : ''}.`
    };
  })
  .build();
