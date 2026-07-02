import { SlateTool } from 'slates';
import { z } from 'zod';
import { SevdeskClient } from '../lib/client';
import { spec } from '../spec';

export let addCommunicationWay = SlateTool.create(spec, {
  name: 'Add Communication Way',
  key: 'add_communication_way',
  description: `Add a communication way (email, phone, website, fax, mobile) to an existing contact in sevDesk.`,
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      contactId: z.string().describe('ID of the contact to add the communication way to'),
      type: z
        .enum(['EMAIL', 'PHONE', 'WEB', 'MOBILE', 'FAX'])
        .describe('Type of communication way'),
      value: z.string().describe('The value (email address, phone number, URL, etc.)'),
      key: z
        .enum(['1', '2', '3', '4', '5'])
        .optional()
        .describe('Key: 1=Private, 2=Work (default), 3=Fax, 4=Mobile, 5=Newsletter/Invoice')
    })
  )
  .output(
    z.object({
      communicationWayId: z.string().describe('ID of the created communication way'),
      contactId: z.string(),
      type: z.string(),
      value: z.string()
    })
  )
  .handleInvocation(async ctx => {
    let client = new SevdeskClient({ token: ctx.auth.token });

    let result = await client.createCommunicationWay({
      contact: { id: ctx.input.contactId, objectName: 'Contact' },
      type: ctx.input.type,
      value: ctx.input.value,
      key: ctx.input.key ? Number.parseInt(ctx.input.key, 10) : 2
    });

    return {
      output: {
        communicationWayId: String(result.id),
        contactId: ctx.input.contactId,
        type: ctx.input.type,
        value: ctx.input.value
      },
      message: `Added ${ctx.input.type} **${ctx.input.value}** to contact **${ctx.input.contactId}**.`
    };
  })
  .build();
