import { SlateTool } from 'slates';
import { z } from 'zod';
import { MailsoftlyClient } from '../lib/client';
import { spec } from '../spec';

export let addCustomFieldToContact = SlateTool.create(spec, {
  name: 'Add Custom Field to Contact',
  key: 'add_custom_field_to_contact',
  description: `Adds a custom field with a value to an existing contact. Custom fields store information beyond the standard contact fields (first name, last name, email). Use **Get Contact Fields** to discover available custom fields.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to add the custom field to.'),
      fieldName: z.string().describe('Name of the custom field.'),
      fieldValue: z.string().describe('Value for the custom field.')
    })
  )
  .output(
    z.object({
      result: z.any().describe('Result of the custom field assignment.')
    })
  )
  .handleInvocation(async ctx => {
    let client = new MailsoftlyClient({ token: ctx.auth.token });

    let result = await client.addCustomFieldToContact(
      ctx.input.contactId,
      ctx.input.fieldName,
      ctx.input.fieldValue
    );

    return {
      output: { result },
      message: `Added custom field **${ctx.input.fieldName}** = "${ctx.input.fieldValue}" to contact **${ctx.input.contactId}**.`
    };
  })
  .build();
