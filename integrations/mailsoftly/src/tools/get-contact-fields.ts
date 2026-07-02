import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let getContactFields = SlateTool.create(spec, {
  name: 'Get Contact Fields',
  key: 'get_contact_fields',
  description: `Retrieves all available contact fields for the firm, including standard and custom fields. Use this to discover which fields can be used when creating, updating, or searching contacts.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      includeCustomFields: z
        .boolean()
        .optional()
        .describe(
          'If true, also fetches custom fields in addition to standard contact fields.'
        )
    })
  )
  .output(
    z.object({
      standardFields: z
        .array(z.any())
        .describe('Standard contact fields available for the firm.'),
      customFields: z
        .array(z.any())
        .optional()
        .describe('Custom fields available for the firm (if requested).')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    let standardFields = await client.getContactFields();

    let customFields: any[] | undefined;
    if (ctx.input.includeCustomFields) {
      customFields = await client.getCustomFields();
    }

    let message = `Retrieved **${standardFields.length}** standard field(s)`;
    if (customFields) {
      message += ` and **${customFields.length}** custom field(s)`;
    }
    message += '.';

    return {
      output: { standardFields, customFields },
      message
    };
  })
  .build();
