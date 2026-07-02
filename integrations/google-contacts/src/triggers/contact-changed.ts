import { ServiceError } from '@lowerdeck/error';
import { GOOGLE_PEOPLE_API_BASE_URL, GooglePeopleClient } from '@slates/google-people-recipes';
import { createAxios, SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { contactOutputSchema, formatContact } from '../lib/schemas';
import { googleContactsActionScopes } from '../scopes';
import { spec } from '../spec';

let isExpiredSyncTokenError = (error: unknown) => {
  if (error instanceof ServiceError && error.data.upstreamStatus === 410) {
    return true;
  }

  let responseStatus =
    typeof (error as any)?.response?.status === 'number'
      ? (error as any).response.status
      : undefined;
  let status = typeof (error as any)?.status === 'number' ? (error as any).status : undefined;

  return responseStatus === 410 || status === 410;
};

let peopleAxios = createAxios({
  baseURL: GOOGLE_PEOPLE_API_BASE_URL
});

export let contactChanged = SlateTrigger.create(spec, {
  name: 'Contact Changed',
  key: 'contact_changed',
  description:
    'Triggers when contacts are created, updated, or deleted. Uses sync tokens to efficiently detect incremental changes.'
})
  .scopes(googleContactsActionScopes.contactChanged)
  .input(
    z.object({
      resourceName: z.string().describe('Resource name of the changed contact'),
      changeType: z
        .enum(['created', 'updated', 'deleted'])
        .describe('Type of change detected'),
      contact: z.any().optional().describe('Contact data (absent for deletions)')
    })
  )
  .output(
    contactOutputSchema.extend({
      changeType: z.string().describe('Type of change: created, updated, or deleted')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new GooglePeopleClient({ token: ctx.auth.token, api: peopleAxios });
      let syncToken = ctx.state?.syncToken as string | undefined;
      let knownContacts = (ctx.state?.knownContacts || {}) as Record<string, boolean>;

      if (!syncToken) {
        // First run: do a full sync to establish baseline
        let allContacts: Record<string, boolean> = {};
        let pageToken: string | undefined;

        // Fetch all contacts to build known set
        do {
          let result = await client.listContacts({
            pageSize: 1000,
            pageToken,
            syncToken: undefined,
            requestSyncToken: true
          });

          for (let conn of result.connections || []) {
            if (conn.resourceName) {
              allContacts[conn.resourceName] = true;
            }
          }

          pageToken = result.nextPageToken;
          syncToken = result.nextSyncToken;
        } while (pageToken);

        return {
          inputs: [],
          updatedState: {
            syncToken,
            knownContacts: allContacts
          }
        };
      }

      // Incremental sync using the sync token
      try {
        let result = await client.listContacts({
          pageSize: 1000,
          syncToken,
          personFields:
            'names,emailAddresses,phoneNumbers,addresses,organizations,birthdays,urls,biographies,events,genders,occupations,nicknames,relations,userDefined,memberships,metadata'
        });

        let inputs: Array<{
          resourceName: string;
          changeType: 'created' | 'updated' | 'deleted';
          contact: any;
        }> = [];

        let updatedKnown = { ...knownContacts };

        for (let conn of result.connections || []) {
          let rn = conn.resourceName as string;
          let isDeleted = conn.metadata?.deleted === true;

          if (isDeleted) {
            inputs.push({
              resourceName: rn,
              changeType: 'deleted',
              contact: undefined
            });
            delete updatedKnown[rn];
          } else if (knownContacts[rn]) {
            inputs.push({
              resourceName: rn,
              changeType: 'updated',
              contact: conn
            });
          } else {
            inputs.push({
              resourceName: rn,
              changeType: 'created',
              contact: conn
            });
            updatedKnown[rn] = true;
          }
        }

        return {
          inputs,
          updatedState: {
            syncToken: result.nextSyncToken || syncToken,
            knownContacts: updatedKnown
          }
        };
      } catch (err: any) {
        // If the sync token is expired, do a full sync
        if (isExpiredSyncTokenError(err)) {
          let allContacts: Record<string, boolean> = {};
          let pageToken: string | undefined;
          let newSyncToken: string | undefined;

          do {
            let result = await client.listContacts({
              pageSize: 1000,
              pageToken,
              requestSyncToken: true
            });

            for (let conn of result.connections || []) {
              if (conn.resourceName) {
                allContacts[conn.resourceName] = true;
              }
            }

            pageToken = result.nextPageToken;
            newSyncToken = result.nextSyncToken;
          } while (pageToken);

          return {
            inputs: [],
            updatedState: {
              syncToken: newSyncToken,
              knownContacts: allContacts
            }
          };
        }
        throw err;
      }
    },

    handleEvent: async ctx => {
      let contact = ctx.input.contact
        ? formatContact(ctx.input.contact)
        : {
            resourceName: ctx.input.resourceName,
            etag: undefined,
            changeType: ctx.input.changeType
          };

      return {
        type: `contact.${ctx.input.changeType}`,
        id: `${ctx.input.resourceName}-${ctx.input.changeType}-${Date.now()}`,
        output: {
          ...contact,
          changeType: ctx.input.changeType
        }
      };
    }
  })
  .build();
