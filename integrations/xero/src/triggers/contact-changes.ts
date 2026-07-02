import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from '@slates/provider';
import { z } from 'zod';
import { createClientFromContext } from '../lib/helpers';
import { spec } from '../spec';

let contactEventSchema = z.object({
  contactId: z.string().describe('Xero contact ID'),
  name: z.string().optional().describe('Contact name'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  emailAddress: z.string().optional().describe('Email address'),
  contactStatus: z.string().optional().describe('Contact status'),
  isSupplier: z.boolean().optional().describe('Is supplier'),
  isCustomer: z.boolean().optional().describe('Is customer'),
  defaultCurrency: z.string().optional().describe('Default currency'),
  taxNumber: z.string().optional().describe('Tax number'),
  updatedDate: z.string().optional().describe('Last updated timestamp'),
  accountNumber: z.string().optional().describe('Account number'),
  website: z.string().optional().describe('Website URL')
});

export let contactChanges = SlateTrigger.create(spec, {
  name: 'Contact Changes',
  key: 'contact_changes',
  description:
    'Triggers when contacts (customers or suppliers) are created or updated in Xero.'
})
  .input(
    z.object({
      contactId: z.string().describe('Xero contact ID'),
      name: z.string().optional(),
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      emailAddress: z.string().optional(),
      contactStatus: z.string().optional(),
      isSupplier: z.boolean().optional(),
      isCustomer: z.boolean().optional(),
      defaultCurrency: z.string().optional(),
      taxNumber: z.string().optional(),
      updatedDate: z.string().optional(),
      accountNumber: z.string().optional(),
      website: z.string().optional()
    })
  )
  .output(contactEventSchema)
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClientFromContext(ctx);

      let lastModified = (ctx.state as any)?.lastModified as string | undefined;

      let result = await client.getContacts({
        modifiedAfter: lastModified,
        order: 'UpdatedDateUTC ASC',
        summaryOnly: true
      });

      let contacts = result.Contacts || [];

      let newLastModified = lastModified;
      if (contacts.length > 0) {
        let lastContact = contacts[contacts.length - 1];
        if (lastContact?.UpdatedDateUTC) {
          newLastModified = lastContact.UpdatedDateUTC;
        }
      }

      return {
        inputs: contacts.map(c => ({
          contactId: c.ContactID || '',
          name: c.Name,
          firstName: c.FirstName,
          lastName: c.LastName,
          emailAddress: c.EmailAddress,
          contactStatus: c.ContactStatus,
          isSupplier: c.IsSupplier,
          isCustomer: c.IsCustomer,
          defaultCurrency: c.DefaultCurrency,
          taxNumber: c.TaxNumber,
          updatedDate: c.UpdatedDateUTC,
          accountNumber: c.AccountNumber,
          website: c.Website
        })),
        updatedState: {
          lastModified: newLastModified
        }
      };
    },

    handleEvent: async ctx => {
      return {
        type: 'contact.updated',
        id: `${ctx.input.contactId}-${ctx.input.updatedDate || Date.now()}`,
        output: {
          contactId: ctx.input.contactId,
          name: ctx.input.name,
          firstName: ctx.input.firstName,
          lastName: ctx.input.lastName,
          emailAddress: ctx.input.emailAddress,
          contactStatus: ctx.input.contactStatus,
          isSupplier: ctx.input.isSupplier,
          isCustomer: ctx.input.isCustomer,
          defaultCurrency: ctx.input.defaultCurrency,
          taxNumber: ctx.input.taxNumber,
          updatedDate: ctx.input.updatedDate,
          accountNumber: ctx.input.accountNumber,
          website: ctx.input.website
        }
      };
    }
  })
  .build();
