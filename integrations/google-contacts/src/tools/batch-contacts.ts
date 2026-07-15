import { ServiceError } from '@lowerdeck/error';
import {
  type ContactInput,
  DEFAULT_PERSON_FIELDS,
  googlePeopleServiceError
} from '@slates/google-people-recipes';
import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { contactInputSchema, contactOutputSchema, formatContact } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

let contactUpdateFieldSchema = z.enum([
  'names',
  'emailAddresses',
  'phoneNumbers',
  'addresses',
  'organizations',
  'birthdays',
  'urls',
  'biographies',
  'userDefined',
  'nicknames',
  'relations',
  'events',
  'occupations'
]);

let updateInputSchema = z.object({
  resourceName: z
    .string()
    .describe('Resource name of the contact to update (for example, "people/c12345")'),
  etag: z.string().describe('Current contact etag from a recent get, list, or search'),
  contactData: contactInputSchema.describe(
    'Replacement values for updateFields. Omit a selected field to clear it.'
  )
});

let statusSchema = z.object({
  code: z
    .number()
    .optional()
    .describe('Google RPC status code; zero or omitted means success'),
  message: z.string().optional().describe('Provider status message')
});

let batchGetResponseSchema = z.object({
  requestedResourceName: z.string().describe('Resource name requested from Google'),
  contact: contactOutputSchema.optional().describe('Contact returned for a successful lookup'),
  status: statusSchema.optional().describe('Per-contact lookup status from Google')
});

let isStaleEtagBatchUpdateError = (error: unknown) =>
  error instanceof ServiceError &&
  (error.data as Record<string, unknown> | undefined)?.upstreamStatus === 400 &&
  /etag|FAILED_PRECONDITION/i.test(error.message ?? '');

let requireOnly = (action: string, inputs: Record<string, unknown>, allowed: string[]) => {
  let incompatible = Object.entries(inputs)
    .filter(
      ([key, value]) => key !== 'action' && value !== undefined && !allowed.includes(key)
    )
    .map(([key]) => key);

  if (incompatible.length > 0) {
    throw googlePeopleServiceError(
      `${incompatible.join(', ')} ${incompatible.length === 1 ? 'is' : 'are'} not valid for action "${action}"`
    );
  }
};

export let batchModifyContacts = SlateTool.create(spec, {
  name: 'Batch Modify Contacts',
  key: 'batch_modify_contacts',
  description: `Creates, updates, deletes, or gets multiple Google contacts in one People API request. Create, update, and get accept up to 200 contacts; delete accepts up to 500.`,
  instructions: [
    'For create, provide contacts.',
    'For update, provide updates and updateFields. Every selected field is replaced or cleared on every contact in the batch.',
    'For delete or get, provide resourceNames.',
    'Action "get" requires the full contacts scope; connections granted only the readonly contacts scope should use get_contact instead.',
    'Google recommends sending mutation requests for the same user sequentially.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .scopes(googleContactsActionScopes.batchModifyContacts)
  .input(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'get'])
        .describe('Batch operation to perform'),
      contacts: z
        .array(contactInputSchema)
        .min(1)
        .max(200)
        .optional()
        .describe('Contacts to create; used only for action "create"'),
      updates: z
        .array(updateInputSchema)
        .min(1)
        .max(200)
        .optional()
        .describe('Contacts and replacement data; used only for action "update"'),
      updateFields: z
        .array(contactUpdateFieldSchema)
        .min(1)
        .optional()
        .describe(
          'Fields replaced or cleared for every update entry; required only for action "update"'
        ),
      resourceNames: z
        .array(z.string())
        .min(1)
        .max(500)
        .optional()
        .describe('Contact resource names; used only for actions "delete" and "get"')
    })
  )
  .output(
    z.object({
      action: z
        .enum(['create', 'update', 'delete', 'get'])
        .describe('Batch operation that was performed'),
      count: z.number().describe('Number of contacts created, updated, deleted, or returned'),
      contacts: z
        .array(contactOutputSchema)
        .optional()
        .describe('Contacts returned by create, update, or get'),
      deletedResourceNames: z
        .array(z.string())
        .optional()
        .describe('Resource names successfully submitted for deletion'),
      responses: z
        .array(batchGetResponseSchema)
        .optional()
        .describe('Per-contact responses for action "get"')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    if (ctx.input.action === 'create') {
      requireOnly(ctx.input.action, ctx.input, ['contacts']);
      if (!ctx.input.contacts) {
        throw googlePeopleServiceError('contacts is required for action "create"');
      }

      let result = await client.batchCreateContacts(ctx.input.contacts);
      let contacts = (result.createdPeople ?? [])
        .map((response: any) => response.person)
        .filter(Boolean)
        .map(formatContact);

      return {
        output: { action: 'create' as const, count: contacts.length, contacts },
        message: `Created **${contacts.length}** contacts.`
      };
    }

    if (ctx.input.action === 'update') {
      requireOnly(ctx.input.action, ctx.input, ['updates', 'updateFields']);
      if (!ctx.input.updates || !ctx.input.updateFields) {
        throw googlePeopleServiceError(
          'updates and updateFields are required for action "update"'
        );
      }

      let resourceNames = ctx.input.updates.map(update => update.resourceName);
      if (new Set(resourceNames).size !== resourceNames.length) {
        throw googlePeopleServiceError('updates must contain unique resourceName values');
      }
      let updateFieldSet = new Set<string>(ctx.input.updateFields);

      let currentResult = await client.batchGetContacts(
        resourceNames,
        `${DEFAULT_PERSON_FIELDS},metadata`
      );
      let currentByResourceName = new Map<string, any>();
      for (let response of currentResult.responses ?? []) {
        if (response.person) {
          currentByResourceName.set(response.requestedResourceName, response.person);
          currentByResourceName.set(response.person.resourceName, response.person);
        }
      }

      let contacts: Record<string, ContactInput & Record<string, unknown>> = {};
      for (let update of ctx.input.updates) {
        let current = currentByResourceName.get(update.resourceName);
        if (!current) {
          throw googlePeopleServiceError(
            `Google did not return a contact for ${update.resourceName}; refresh the resource name and try again`
          );
        }
        if (current.etag !== update.etag) {
          throw googlePeopleServiceError(
            `The etag for ${update.resourceName} is stale; get the contact again before updating`
          );
        }

        let contactSources = current.metadata?.sources;
        let contactSource = Array.isArray(contactSources)
          ? contactSources.find(
              (source: any) => source?.type === 'CONTACT' && typeof source.etag === 'string'
            )
          : undefined;
        if (!contactSource) {
          throw googlePeopleServiceError(
            `Google did not return contact source metadata for ${update.resourceName}; get the contact again before updating`
          );
        }

        let ignoredFields = Object.keys(update.contactData).filter(
          field => !updateFieldSet.has(field)
        );
        if (ignoredFields.length > 0) {
          throw googlePeopleServiceError(
            `${ignoredFields.join(', ')} must be included in updateFields for ${update.resourceName}`
          );
        }

        let contact: Record<string, unknown> = {
          resourceName: current.resourceName,
          etag: current.etag,
          metadata: { sources: contactSources }
        };
        for (let field of ctx.input.updateFields) {
          let value = update.contactData[field];
          if (value !== undefined) {
            contact[field] = value;
          }
        }
        contacts[update.resourceName] = contact as ContactInput & Record<string, unknown>;
      }

      let updateMask = [...updateFieldSet].join(',');
      let result: any;
      try {
        result = await client.batchUpdateContacts(contacts, updateMask);
      } catch (error) {
        if (isStaleEtagBatchUpdateError(error)) {
          let staleEtagError = googlePeopleServiceError(
            'Google rejected the batch update because at least one contact etag is stale. Re-fetch the contacts (for example with get_contact, list_contacts, or search_contacts) to obtain fresh etags, then retry.'
          );
          if (error instanceof Error) {
            staleEtagError.setParent(error);
          }
          throw staleEtagError;
        }
        throw error;
      }
      let updatedContacts = Object.values(result?.updateResult ?? {})
        .map((response: any) => response.person)
        .filter(Boolean)
        .map(formatContact);
      let updatedCount =
        updatedContacts.length > 0 ? updatedContacts.length : ctx.input.updates.length;

      return {
        output: {
          action: 'update' as const,
          count: updatedCount,
          contacts: updatedContacts.length > 0 ? updatedContacts : undefined
        },
        message: `Updated **${updatedCount}** contacts.`
      };
    }

    requireOnly(ctx.input.action, ctx.input, ['resourceNames']);
    if (!ctx.input.resourceNames) {
      throw googlePeopleServiceError(
        `resourceNames is required for action "${ctx.input.action}"`
      );
    }

    if (ctx.input.action === 'delete') {
      await client.batchDeleteContacts(ctx.input.resourceNames);
      return {
        output: {
          action: 'delete' as const,
          count: ctx.input.resourceNames.length,
          deletedResourceNames: ctx.input.resourceNames
        },
        message: `Deleted **${ctx.input.resourceNames.length}** contacts.`
      };
    }

    if (ctx.input.resourceNames.length > 200) {
      throw googlePeopleServiceError('action "get" accepts at most 200 resourceNames');
    }

    let result = await client.batchGetContacts(ctx.input.resourceNames);
    let responses = (result.responses ?? []).map((response: any) => ({
      requestedResourceName: response.requestedResourceName,
      contact: response.person ? formatContact(response.person) : undefined,
      status: response.status
        ? {
            code: response.status.code,
            message: response.status.message
          }
        : undefined
    }));
    let contacts = responses.flatMap((response: { contact?: any }) =>
      response.contact ? [response.contact] : []
    );

    return {
      output: {
        action: 'get' as const,
        count: contacts.length,
        contacts,
        responses
      },
      message: `Retrieved **${contacts.length}** of **${ctx.input.resourceNames.length}** requested contacts.`
    };
  })
  .build();
