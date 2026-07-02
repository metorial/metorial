import { SlateTool } from 'slates';
import { z } from 'zod';
import { UnisenderClient } from '../lib/client';
import { spec } from '../spec';

export let subscribeContact = SlateTool.create(spec, {
  name: 'Subscribe Contact',
  key: 'subscribe_contact',
  description: `Subscribe an email address and/or phone number to one or more contact lists. Allows setting contact fields (name, email, phone, custom fields), tags, and double opt-in behavior.
Set **doubleOptin** to \`3\` to add contacts without sending a confirmation email.`,
  instructions: [
    'Fields should use standard Unisender field names: "email", "phone", "Name", etc.',
    'Custom field names are case-sensitive and must match exactly as defined in your account.'
  ],
  constraints: ['Rate limit: 300 requests per 60 seconds per API key or IP address.']
})
  .input(
    z.object({
      listIds: z.array(z.number()).describe('IDs of lists to subscribe the contact to'),
      fields: z
        .record(z.string(), z.string())
        .describe(
          'Contact fields as key-value pairs (e.g., {"email": "user@example.com", "Name": "John"})'
        ),
      tags: z.string().optional().describe('Comma-separated tags to assign to the contact'),
      doubleOptin: z
        .enum(['0', '1', '3'])
        .optional()
        .describe('0=use list default, 1=force double opt-in, 3=skip confirmation'),
      overwrite: z
        .enum(['0', '1', '2'])
        .optional()
        .describe('0=do not overwrite, 1=overwrite fields, 2=append to lists'),
      requestIp: z.string().optional().describe('IP address of the subscriber'),
      requestTime: z
        .string()
        .optional()
        .describe('Time of the subscription request (YYYY-MM-DD HH:MM:SS)')
    })
  )
  .output(
    z.object({
      personId: z.number().describe('ID of the subscribed contact')
    })
  )
  .handleInvocation(async ctx => {
    let client = new UnisenderClient({
      token: ctx.auth.token,
      locale: ctx.config.locale
    });

    let result = await client.subscribe({
      list_ids: ctx.input.listIds.join(','),
      fields: ctx.input.fields,
      tags: ctx.input.tags,
      double_optin: ctx.input.doubleOptin ? Number(ctx.input.doubleOptin) : undefined,
      overwrite: ctx.input.overwrite ? Number(ctx.input.overwrite) : undefined,
      request_ip: ctx.input.requestIp,
      request_time: ctx.input.requestTime
    });

    let email = ctx.input.fields.email || 'contact';
    return {
      output: { personId: result.person_id },
      message: `Subscribed **${email}** to list(s) \`${ctx.input.listIds.join(', ')}\`. Person ID: \`${result.person_id}\``
    };
  })
  .build();
