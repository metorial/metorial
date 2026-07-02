import { SlateTool } from 'slates';
import { z } from 'zod';
import { ThanksIoClient } from '../lib/client';
import { spec } from '../spec';

export let manageRecipients = SlateTool.create(spec, {
  name: 'Manage Recipients',
  key: 'manage_recipients',
  description: `Create, retrieve, update, or delete recipients in a mailing list. Supports single and bulk creation, deletion by ID or by address/email.
If no valid address is provided but an email is, Thanks.io can attempt to look up the mailing address from the email (for a fee).`,
  instructions: [
    'Set action to "create", "get", "update", "delete", or "delete_by_address".',
    'For "create", mailingListId is required along with address or email.',
    'For "get", "update", or "delete", recipientId is required.',
    'For "delete_by_address", mailingListId and either address fields or email are required.'
  ],
  constraints: ['Only US and Canadian addresses are accepted.'],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['create', 'get', 'update', 'delete', 'delete_by_address'])
        .describe('Action to perform'),
      recipientId: z.number().optional().describe('Recipient ID (for get, update, delete)'),
      mailingListId: z
        .number()
        .optional()
        .describe('Mailing list ID (required for create and delete_by_address)'),
      name: z.string().optional().describe('Recipient full name'),
      company: z.string().optional().describe('Company name'),
      address: z.string().optional().describe('Street address'),
      address2: z.string().optional().describe('Address line 2'),
      city: z.string().optional().describe('City'),
      province: z.string().optional().describe('State/province code'),
      postalCode: z.string().optional().describe('ZIP/postal code'),
      country: z.string().optional().describe('Country code (US or CA)'),
      email: z.string().optional().describe('Email address'),
      phone: z.string().optional().describe('Phone number'),
      dob: z.string().optional().describe('Date of birth (YYYY-MM-DD)'),
      custom1: z.string().optional().describe('Custom field 1'),
      custom2: z.string().optional().describe('Custom field 2'),
      custom3: z.string().optional().describe('Custom field 3'),
      custom4: z.string().optional().describe('Custom field 4')
    })
  )
  .output(
    z.object({
      recipientId: z.number().optional().describe('Recipient ID'),
      mailingListId: z.number().optional().describe('Mailing list ID'),
      name: z.string().optional().nullable().describe('Recipient name'),
      company: z.string().optional().nullable().describe('Company name'),
      address: z.string().optional().nullable().describe('Street address'),
      city: z.string().optional().nullable().describe('City'),
      province: z.string().optional().nullable().describe('State/province'),
      postalCode: z.string().optional().nullable().describe('ZIP/postal code'),
      country: z.string().optional().nullable().describe('Country'),
      email: z.string().optional().nullable().describe('Email'),
      phone: z.string().optional().nullable().describe('Phone'),
      deleted: z.boolean().optional().describe('Whether the recipient was deleted'),
      statusMessage: z.string().optional().describe('Status message for delete operations')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ThanksIoClient({ token: ctx.auth.token });
    let { action } = ctx.input;

    if (action === 'create') {
      if (!ctx.input.mailingListId)
        throw new Error('mailingListId is required for create action');
      let result = await client.createRecipient({
        mailingListId: ctx.input.mailingListId,
        name: ctx.input.name,
        company: ctx.input.company,
        address: ctx.input.address,
        address2: ctx.input.address2,
        city: ctx.input.city,
        province: ctx.input.province,
        postalCode: ctx.input.postalCode,
        country: ctx.input.country,
        email: ctx.input.email,
        phone: ctx.input.phone,
        dob: ctx.input.dob,
        custom1: ctx.input.custom1,
        custom2: ctx.input.custom2,
        custom3: ctx.input.custom3,
        custom4: ctx.input.custom4
      });
      return {
        output: {
          recipientId: result.id as number,
          mailingListId: result.mailing_list_id as number,
          name: result.name as string | null,
          company: result.company as string | null,
          address: result.address as string | null,
          city: result.city as string | null,
          province: result.province as string | null,
          postalCode: result.postal_code as string | null,
          country: result.country as string | null,
          email: result.email as string | null,
          phone: result.phone as string | null
        },
        message: `Created recipient **#${result.id}** in mailing list **#${result.mailing_list_id}**.`
      };
    }

    if (action === 'get') {
      if (!ctx.input.recipientId) throw new Error('recipientId is required for get action');
      let result = await client.getRecipient(ctx.input.recipientId);
      return {
        output: {
          recipientId: result.id as number,
          mailingListId: result.mailing_list_id as number,
          name: result.name as string | null,
          company: result.company as string | null,
          address: result.address as string | null,
          city: result.city as string | null,
          province: result.province as string | null,
          postalCode: result.postal_code as string | null,
          country: result.country as string | null,
          email: result.email as string | null,
          phone: result.phone as string | null
        },
        message: `Retrieved recipient **#${result.id}**: ${result.name || 'unnamed'}.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.recipientId) throw new Error('recipientId is required for update action');
      let result = await client.updateRecipient(ctx.input.recipientId, {
        name: ctx.input.name,
        company: ctx.input.company,
        address: ctx.input.address,
        address2: ctx.input.address2,
        city: ctx.input.city,
        province: ctx.input.province,
        postalCode: ctx.input.postalCode,
        country: ctx.input.country,
        email: ctx.input.email,
        phone: ctx.input.phone,
        dob: ctx.input.dob,
        custom1: ctx.input.custom1,
        custom2: ctx.input.custom2,
        custom3: ctx.input.custom3,
        custom4: ctx.input.custom4
      });
      return {
        output: {
          recipientId: result.id as number,
          mailingListId: result.mailing_list_id as number,
          name: result.name as string | null,
          company: result.company as string | null,
          address: result.address as string | null,
          city: result.city as string | null,
          province: result.province as string | null,
          postalCode: result.postal_code as string | null,
          country: result.country as string | null,
          email: result.email as string | null,
          phone: result.phone as string | null
        },
        message: `Updated recipient **#${result.id}**.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.recipientId) throw new Error('recipientId is required for delete action');
      await client.deleteRecipient(ctx.input.recipientId);
      return {
        output: {
          recipientId: ctx.input.recipientId,
          deleted: true,
          statusMessage: 'Recipient deleted successfully.'
        },
        message: `Deleted recipient **#${ctx.input.recipientId}**.`
      };
    }

    if (action === 'delete_by_address') {
      if (!ctx.input.mailingListId)
        throw new Error('mailingListId is required for delete_by_address action');
      let result = await client.deleteRecipientByAddress({
        mailingListId: ctx.input.mailingListId,
        address: ctx.input.address,
        address2: ctx.input.address2,
        city: ctx.input.city,
        province: ctx.input.province,
        postalCode: ctx.input.postalCode,
        country: ctx.input.country,
        email: ctx.input.email
      });
      return {
        output: {
          deleted: true,
          statusMessage: (result.message as string) || 'Recipient deleted by address.'
        },
        message: `Deleted recipient by address/email from mailing list **#${ctx.input.mailingListId}**.`
      };
    }

    throw new Error(`Unknown action: ${action}`);
  })
  .build();
