import { createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

let recipientSchema = z.object({
  recipientId: z.string().describe('Unique ID of the recipient'),
  firstName: z.string().optional().describe('First name'),
  lastName: z.string().optional().describe('Last name'),
  businessName: z.string().optional().describe('Business/company name'),
  address1: z.string().optional().describe('Street address line 1'),
  address2: z.string().optional().describe('Street address line 2'),
  city: z.string().optional().describe('City'),
  state: z.string().optional().describe('State/province'),
  zip: z.string().optional().describe('Postal/ZIP code'),
  countryId: z.number().optional().describe('Country ID from list_countries'),
  birthday: z.string().optional().describe('Birthday (YYYY-MM-DD)')
});

export let manageAddressBook = SlateTool.create(spec, {
  name: 'Manage Address Book',
  key: 'manage_address_book',
  description: `Create, update, delete, search, or list recipient contacts in the Handwrytten address book. Set the **action** field to choose the operation. When searching, provide a query to match against name, address, or other fields.`,
  instructions: [
    'To create: set action to "create" and provide recipient address fields.',
    'To update: set action to "update" and provide the recipientId and fields to change.',
    'To delete: set action to "delete" and provide the recipientId.',
    'To search: set action to "search" and provide a searchQuery.',
    'To list all: set action to "list".'
  ],
  tags: {
    destructive: false,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum(['list', 'search', 'create', 'update', 'delete'])
        .describe('Operation to perform on the address book'),
      recipientId: z
        .string()
        .optional()
        .describe('Recipient ID (required for update and delete)'),
      searchQuery: z
        .string()
        .optional()
        .describe('Search query to find contacts (for search action)'),

      firstName: z.string().optional().describe('First name'),
      lastName: z.string().optional().describe('Last name'),
      businessName: z.string().optional().describe('Business/company name'),
      address1: z.string().optional().describe('Street address line 1'),
      address2: z.string().optional().describe('Street address line 2'),
      city: z.string().optional().describe('City'),
      state: z.string().optional().describe('State/province'),
      zip: z.string().optional().describe('Postal/ZIP code'),
      countryId: z.number().optional().describe('Country ID from list_countries'),
      birthday: z.string().optional().describe('Birthday in YYYY-MM-DD format')
    })
  )
  .output(
    z.object({
      recipients: z
        .array(recipientSchema)
        .optional()
        .describe('List of recipients (for list/search)'),
      recipientId: z
        .string()
        .optional()
        .describe('ID of the created/updated/deleted recipient'),
      success: z.boolean().describe('Whether the operation was successful')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });
    let { action } = ctx.input;

    let mapRecipient = (r: any) => ({
      recipientId: String(r.id),
      firstName: r.first_name ?? undefined,
      lastName: r.last_name ?? undefined,
      businessName: r.business_name ?? undefined,
      address1: r.address1 ?? undefined,
      address2: r.address2 ?? undefined,
      city: r.city ?? undefined,
      state: r.state ?? undefined,
      zip: r.zip != null ? String(r.zip) : undefined,
      countryId: r.country_id != null ? Number(r.country_id) : undefined,
      birthday: r.birthday ?? undefined
    });

    if (action === 'list') {
      let result = await client.listRecipients();
      let rawRecipients = result.addresses ?? result.recipients ?? result.data ?? [];
      let recipients = rawRecipients.map(mapRecipient);
      return {
        output: { recipients, success: true },
        message: `Found **${recipients.length}** recipients in the address book.`
      };
    }

    if (action === 'search') {
      if (!ctx.input.searchQuery) {
        throw createApiServiceError('searchQuery is required for search action');
      }
      let results = await client.searchRecipients(ctx.input.searchQuery);
      let recipients = results.map(mapRecipient);
      return {
        output: { recipients, success: true },
        message: `Found **${recipients.length}** recipients matching "${ctx.input.searchQuery}".`
      };
    }

    if (action === 'create') {
      if (!ctx.input.address1 || !ctx.input.city || !ctx.input.zip) {
        throw createApiServiceError(
          'address1, city, and zip are required to create a recipient'
        );
      }
      let result = await client.addRecipient({
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        businessName: ctx.input.businessName,
        address1: ctx.input.address1,
        address2: ctx.input.address2,
        city: ctx.input.city,
        state: ctx.input.state,
        zip: ctx.input.zip,
        countryId: ctx.input.countryId,
        birthday: ctx.input.birthday
      });
      let returnedId = result.address_id ?? result.id ?? result.recipient_id;
      if (
        returnedId === undefined ||
        returnedId === null ||
        String(returnedId).trim() === ''
      ) {
        throw createApiServiceError(
          'Handwrytten did not return a recipient address ID. Check the address book before retrying.'
        );
      }
      let recipientId = String(returnedId);
      return {
        output: { recipientId, success: true },
        message: `Created recipient **${[ctx.input.firstName, ctx.input.lastName].filter(Boolean).join(' ') || 'contact'}** with ID \`${recipientId}\`.`
      };
    }

    if (action === 'update') {
      if (!ctx.input.recipientId) {
        throw createApiServiceError('recipientId is required for update action');
      }
      if (
        ![
          ctx.input.firstName,
          ctx.input.lastName,
          ctx.input.businessName,
          ctx.input.address1,
          ctx.input.address2,
          ctx.input.city,
          ctx.input.state,
          ctx.input.zip,
          ctx.input.countryId,
          ctx.input.birthday
        ].some(value => value !== undefined)
      ) {
        throw createApiServiceError('Provide at least one recipient field to update.');
      }
      await client.updateRecipient(ctx.input.recipientId, {
        firstName: ctx.input.firstName,
        lastName: ctx.input.lastName,
        businessName: ctx.input.businessName,
        address1: ctx.input.address1,
        address2: ctx.input.address2,
        city: ctx.input.city,
        state: ctx.input.state,
        zip: ctx.input.zip,
        countryId: ctx.input.countryId,
        birthday: ctx.input.birthday
      });
      return {
        output: { recipientId: ctx.input.recipientId, success: true },
        message: `Updated recipient \`${ctx.input.recipientId}\`.`
      };
    }

    if (action === 'delete') {
      if (!ctx.input.recipientId) {
        throw createApiServiceError('recipientId is required for delete action');
      }
      await client.deleteRecipient(ctx.input.recipientId);
      return {
        output: { recipientId: ctx.input.recipientId, success: true },
        message: `Deleted recipient \`${ctx.input.recipientId}\`.`
      };
    }

    throw createApiServiceError(`Unknown action: ${action}`);
  })
  .build();
