import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createWixClient } from '../lib/helpers';
import { spec } from '../spec';

let contactInfoSchema = z
  .object({
    name: z
      .object({
        first: z.string().optional(),
        last: z.string().optional()
      })
      .optional()
      .describe('Contact name'),
    emails: z
      .array(
        z.object({
          email: z.string(),
          tag: z.enum(['MAIN', 'HOME', 'WORK', 'UNTAGGED']).optional(),
          primary: z.boolean().optional()
        })
      )
      .optional()
      .describe('Contact email addresses'),
    phones: z
      .array(
        z.object({
          phone: z.string(),
          tag: z.enum(['MAIN', 'HOME', 'WORK', 'MOBILE', 'FAX', 'UNTAGGED']).optional(),
          countryCode: z
            .string()
            .optional()
            .describe('ISO-3166 alpha-2 country code of the phone number, e.g. "US"'),
          primary: z.boolean().optional()
        })
      )
      .optional()
      .describe('Contact phone numbers'),
    addresses: z
      .array(
        z.object({
          address: z
            .object({
              streetAddress: z
                .object({
                  name: z.string().optional(),
                  number: z.string().optional()
                })
                .optional(),
              addressLine: z
                .string()
                .optional()
                .describe('Free-text main address line; use instead of streetAddress'),
              addressLine2: z.string().optional().describe('Apartment, suite, or floor'),
              city: z.string().optional(),
              subdivision: z
                .string()
                .optional()
                .describe('ISO 3166-2 subdivision code, e.g. "US-NY"'),
              country: z.string().optional().describe('ISO-3166 alpha-2 country code'),
              postalCode: z.string().optional()
            })
            .optional(),
          tag: z.enum(['BILLING', 'SHIPPING', 'HOME', 'WORK', 'UNTAGGED']).optional()
        })
      )
      .optional()
      .describe('Contact addresses'),
    company: z.string().optional().describe('Company name'),
    jobTitle: z.string().optional().describe('Job title'),
    birthdate: z.string().optional().describe('Birthdate in YYYY-MM-DD format'),
    locale: z.string().optional().describe('Locale code, e.g. "en-US"'),
    labelKeys: z.array(z.string()).optional().describe('Existing label keys to assign')
  })
  .describe('Contact information');

type ContactInfoInput = z.infer<typeof contactInfoSchema>;

// Contacts v4 wraps list fields in { items: [...] } objects.
let toWixContactInfo = (info: ContactInfoInput) => {
  let { emails, phones, addresses, labelKeys, ...rest } = info;
  let result: Record<string, any> = { ...rest };
  if (emails) result.emails = { items: emails };
  if (phones) result.phones = { items: phones };
  if (addresses) result.addresses = { items: addresses };
  if (labelKeys) result.labelKeys = { items: labelKeys };
  return result;
};

export let manageContacts = SlateTool.create(spec, {
  name: 'Manage Contacts',
  key: 'manage_contacts',
  description: `Create, update, delete, or retrieve CRM contacts on a Wix site.
Use **action** to specify the operation: \`get\`, \`list\`, \`create\`, \`update\`, or \`delete\`.
Contacts include name, emails, phones, addresses, company info, and custom labels.`,
  instructions: [
    'For "update", you must include the contact revision number (from get or list) to prevent overwriting concurrent changes.',
    "You cannot update a member's primary email via Contacts API; use the Members API instead."
  ],
  tags: { destructive: false, readOnly: false }
})
  .input(
    z.object({
      action: z
        .enum(['get', 'list', 'create', 'update', 'delete'])
        .describe('Operation to perform'),
      contactId: z
        .string()
        .optional()
        .describe('Contact ID (required for get, update, delete)'),
      contactInfo: contactInfoSchema
        .optional()
        .describe('Contact information (for create/update)'),
      revision: z
        .number()
        .optional()
        .describe('Contact revision number (required for update)'),
      allowDuplicates: z
        .boolean()
        .optional()
        .describe(
          'Allow an email or phone already used by another contact (for create/update)'
        ),
      search: z
        .string()
        .optional()
        .describe(
          'Exact-match text search on first name, last name, email, or phone (for list)'
        ),
      filter: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Filter object for list action, e.g. {"info.name.last": {"$startsWith": "Sm"}}'
        ),
      sort: z
        .array(
          z.object({
            fieldName: z.string(),
            order: z.enum(['ASC', 'DESC'])
          })
        )
        .optional()
        .describe('Sort specification for list action'),
      limit: z.number().optional().describe('Max items to return (for list, default 50)'),
      offset: z.number().optional().describe('Number of items to skip (for list)')
    })
  )
  .output(
    z.object({
      contact: z.any().optional().describe('Single contact data'),
      contacts: z.array(z.any()).optional().describe('List of contacts'),
      totalResults: z.number().optional().describe('Total number of matching contacts')
    })
  )
  .handleInvocation(async ctx => {
    let client = createWixClient(ctx.auth, ctx.config);

    switch (ctx.input.action) {
      case 'get': {
        if (!ctx.input.contactId)
          throw createApiServiceError('contactId is required for get action');
        let result = await client.getContact(ctx.input.contactId);
        return {
          output: { contact: result.contact },
          message: `Retrieved contact **${result.contact?.info?.name?.first || ''} ${result.contact?.info?.name?.last || ''}** (ID: ${ctx.input.contactId})`
        };
      }
      case 'list': {
        let result = await client.queryContacts({
          filter: ctx.input.filter,
          sort: ctx.input.sort,
          limit: ctx.input.limit,
          offset: ctx.input.offset,
          search: ctx.input.search
        });
        let contacts = result.contacts || [];
        return {
          output: { contacts, totalResults: result.pagingMetadata?.total },
          message: `Found **${contacts.length}** contacts${result.pagingMetadata?.total ? ` out of ${result.pagingMetadata.total} total` : ''}`
        };
      }
      case 'create': {
        if (!ctx.input.contactInfo)
          throw createApiServiceError('contactInfo is required for create action');
        let result = await client.createContact(
          toWixContactInfo(ctx.input.contactInfo),
          ctx.input.allowDuplicates
        );
        return {
          output: { contact: result.contact },
          message: `Created contact **${result.contact?.info?.name?.first || ''} ${result.contact?.info?.name?.last || ''}** (ID: ${result.contact?.id})`
        };
      }
      case 'update': {
        if (!ctx.input.contactId)
          throw createApiServiceError('contactId is required for update action');
        if (ctx.input.revision === undefined)
          throw createApiServiceError('revision is required for update action');
        if (!ctx.input.contactInfo)
          throw createApiServiceError('contactInfo is required for update action');
        let result = await client.updateContact(
          ctx.input.contactId,
          ctx.input.revision,
          toWixContactInfo(ctx.input.contactInfo),
          ctx.input.allowDuplicates
        );
        return {
          output: { contact: result.contact },
          message: `Updated contact **${ctx.input.contactId}**`
        };
      }
      case 'delete': {
        if (!ctx.input.contactId)
          throw createApiServiceError('contactId is required for delete action');
        await client.deleteContact(ctx.input.contactId);
        return {
          output: {},
          message: `Deleted contact **${ctx.input.contactId}**`
        };
      }
    }
  })
  .build();
