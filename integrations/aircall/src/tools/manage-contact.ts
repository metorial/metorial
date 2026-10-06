import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { fail, id, pickDefined, type Row, row, text } from '../lib/contracts';
import { spec } from '../spec';

export let manageContact = SlateTool.create(spec, {
  name: 'Manage Contact',
  key: 'manage_contact',
  description: `Create, update, or delete a contact in Aircall. Creation requires at least one phone number; names are optional. When updating, specify only the fields to change. Also supports adding, updating, or removing phone numbers and emails on existing contacts.`,
  constraints: [
    'Contact phone values are normalized by Aircall and may be stored as text; outbound-call targets require E.164.',
    'Max 20 secondary phone numbers and emails per contact.'
  ],
  tags: {
    destructive: true
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'create',
          'update',
          'delete',
          'add_phone',
          'update_phone',
          'delete_phone',
          'add_email',
          'update_email',
          'delete_email'
        ])
        .describe('The operation to perform'),
      contactId: z
        .number()
        .optional()
        .describe('Contact ID (required for update, delete, and phone/email operations)'),
      firstName: z.string().optional().describe('First name (optional for create)'),
      lastName: z.string().optional().describe('Last name (optional for create)'),
      companyName: z.string().optional().describe('Company name'),
      information: z.string().optional().describe('Additional information or notes'),
      phoneNumbers: z
        .array(
          z.object({
            label: z.string().describe('Label (e.g., Work, Mobile, Home)'),
            value: z.string().describe('Contact phone value, normalized by Aircall')
          })
        )
        .optional()
        .describe('Phone numbers (required for create, at least one)'),
      emails: z
        .array(
          z.object({
            label: z.string().describe('Label (e.g., Work, Personal)'),
            value: z.string().describe('Email address')
          })
        )
        .optional()
        .describe('Email addresses'),
      phoneNumberId: z
        .number()
        .optional()
        .describe('Phone number ID (for update_phone/delete_phone)'),
      emailId: z.number().optional().describe('Email ID (for update_email/delete_email)'),
      label: z
        .string()
        .optional()
        .describe('Label for phone/email (for add/update phone/email)'),
      value: z
        .string()
        .optional()
        .describe('Value for phone/email (for add/update phone/email)')
    })
  )
  .output(
    z.object({
      contactId: z.number().optional().describe('Contact ID'),
      fullName: z.string().optional().describe('Full name of the contact'),
      accepted: z.boolean().optional(),
      confirmed: z.boolean().optional(),
      pending: z.boolean().optional(),
      deleted: z.boolean().optional().describe('Whether the contact was deleted')
    })
  )
  .handleInvocation(async ctx => {
    const client = new Client(ctx.auth),
      action = ctx.input.action;
    const data = pickDefined({
      first_name:
        ctx.input.firstName === undefined
          ? undefined
          : text(ctx.input.firstName, 'firstName', 255),
      last_name:
        ctx.input.lastName === undefined
          ? undefined
          : text(ctx.input.lastName, 'lastName', 255),
      company_name:
        ctx.input.companyName === undefined
          ? undefined
          : text(ctx.input.companyName, 'companyName', 255),
      information:
        ctx.input.information === undefined
          ? undefined
          : text(ctx.input.information, 'information')
    });
    const receipt = (contact: Row) => ({
      contactId: id(contact.id),
      fullName:
        typeof contact.name === 'string'
          ? text(contact.name, 'Native contact name')
          : undefined
    });
    if (action === 'create') {
      if (
        !ctx.input.phoneNumbers?.length ||
        ctx.input.phoneNumbers.length > 20 ||
        (ctx.input.emails?.length ?? 0) > 20
      )
        fail(
          'Creating a shared contact requires one to twenty phone numbers and at most twenty emails.'
        );
      const details = (items: Array<{ label: string; value: string }>) =>
        items.map(v => ({
          label: text(v.label, 'label', 255),
          value: text(v.value, 'value', 320)
        }));
      const contact = await client.createContact({
        ...data,
        phone_numbers: details(ctx.input.phoneNumbers),
        emails: ctx.input.emails === undefined ? undefined : details(ctx.input.emails)
      });
      return {
        output: {
          ...receipt(contact),
          accepted: true,
          confirmed: false
        },
        message:
          'Aircall acknowledged shared-contact creation. Phone values may be normalized and the complete stored details are not independently confirmed. Save the returned ID before further operations; identical retries create duplicates.'
      };
    }
    const contactId = id(ctx.input.contactId, 'contactId');
    if (action === 'delete') {
      await client.deleteContact(contactId);
      return {
        output: { contactId, deleted: true, confirmed: true },
        message:
          'Confirmed exact shared-contact absence after the native deletion acknowledgement and accessible company readback. This does not erase call history.'
      };
    }
    if (action === 'update') {
      if (ctx.input.phoneNumbers !== undefined || ctx.input.emails !== undefined)
        fail(
          'Contact updates do not replace phone/email collections. Use the corresponding add, update or delete detail action.'
        );
      if (!Object.keys(data).length) fail('Supply at least one supported contact field.');
      await client.updateContact(contactId, data);
      const current = await client.getContact(contactId);
      for (const [k, v] of Object.entries(data))
        if (current[k] !== v)
          fail(
            'The contact update is acknowledged but native fields are not yet verified.',
            'aircall_pending'
          );
      return {
        output: { ...receipt(current), accepted: true, confirmed: true },
        message: 'Verified updated shared-contact fields.'
      };
    }
    const kind = action.endsWith('phone') ? 'phone' : 'email',
      operation = action.startsWith('add_')
        ? 'add'
        : action.startsWith('update_')
          ? 'update'
          : 'delete',
      detailId = kind === 'phone' ? ctx.input.phoneNumberId : ctx.input.emailId;
    await client.getContact(contactId);
    const current = await client.contactDetail(
      contactId,
      kind,
      operation,
      detailId,
      ctx.input.label,
      ctx.input.value
    );
    const details = current[kind === 'phone' ? 'phone_numbers' : 'emails'];
    if (!Array.isArray(details))
      fail(
        'Aircall omitted the independent contact-detail observer. Reconcile before retrying.',
        'aircall_receipt'
      );
    if (operation === 'delete' && details.some(v => id(row(v).id) === detailId))
      fail('Aircall acknowledged removal but the detail remains readable.', 'aircall_pending');
    return {
      output: { ...receipt(current), accepted: true, confirmed: operation === 'delete' },
      message:
        operation === 'delete'
          ? 'Verified exact contact-detail absence.'
          : 'Aircall returned a native detail acknowledgement and current contact. Phone values may be normalized; update is accepted, not a claim about duplicate-free association or irreversible completion.'
    };
  })
  .build();
