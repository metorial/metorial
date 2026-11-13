import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  formatContact,
  GooglePeopleClient,
  getContactRecipe,
  googlePeopleApiError,
  listContactsRecipe,
  searchContactsRecipe
} from './index';

describe('google people recipes', () => {
  // https://developers.google.com/people/api/rest/v1/people.connections/list
  // https://developers.google.com/people/api/rest/v1/people#Source
  it('requests paginated CONTACT-only revisions without losing source metadata', async () => {
    const calls: Array<{ url: string; config: any }> = [];
    const data = {
      connections: [
        {
          resourceName: 'people/c1',
          metadata: {
            sources: [
              {
                type: 'CONTACT',
                id: '1',
                updateTime: '2026-11-10T10:00:00.123456789Z',
                etag: 'source-etag'
              }
            ]
          }
        }
      ],
      nextPageToken: 'next'
    };
    const client = new GooglePeopleClient({
      token: 'test-token',
      api: {
        get: async (url, config) => {
          calls.push({ url, config });
          return { data };
        }
      }
    });
    expect(await client.listContactRevisions()).toEqual(data);
    expect(await client.listContactRevisions('next')).toEqual(data);
    expect(calls[0]).toMatchObject({
      url: 'people/me/connections',
      config: {
        params: {
          sources: 'READ_SOURCE_TYPE_CONTACT',
          sortOrder: 'LAST_MODIFIED_DESCENDING',
          pageSize: 1000
        },
        headers: { Authorization: 'Bearer test-token' }
      }
    });
    expect(calls[0]!.config.params.personFields.split(',')).toContain('metadata');
    expect(calls[1]!.config.params).toEqual({ ...calls[0]!.config.params, pageToken: 'next' });
  });

  it('preserves upstream failures when listing contact revisions', async () => {
    const client = new GooglePeopleClient({
      token: 'test-token',
      api: {
        get: async () => {
          throw { response: { status: 429, data: { error: { message: 'Quota exceeded' } } } };
        }
      }
    });
    await expect(client.listContactRevisions()).rejects.toMatchObject({
      data: { reason: 'google_people_api_error', upstreamStatus: 429 }
    });
  });

  it('uses MCP-compatible top-level object input schemas', () => {
    for (let recipe of [listContactsRecipe, searchContactsRecipe, getContactRecipe]) {
      let jsonSchema = z.toJSONSchema(recipe.inputSchema) as Record<string, unknown>;

      expect(jsonSchema.type).toBe('object');
      expect(jsonSchema).not.toHaveProperty('oneOf');
      expect(jsonSchema).not.toHaveProperty('anyOf');
      expect(jsonSchema).not.toHaveProperty('allOf');
    }
  });

  it('formats People API contact fields for tool output', () => {
    let formatted = formatContact({
      resourceName: 'people/c123',
      etag: 'etag-123',
      names: [{ displayName: 'Ada Lovelace', givenName: 'Ada', familyName: 'Lovelace' }],
      emailAddresses: [{ value: 'ada@example.com', type: 'work' }],
      phoneNumbers: [{ value: '+15551234567', type: 'mobile' }],
      organizations: [{ name: 'Analytical Engines', title: 'Programmer' }],
      birthdays: [{ date: { month: 12, day: 10 } }],
      userDefined: [{ key: 'crmId', value: 'crm-123' }],
      memberships: [
        {
          contactGroupMembership: {
            contactGroupResourceName: 'contactGroups/friends'
          }
        }
      ]
    });

    expect(formatted).toMatchObject({
      resourceName: 'people/c123',
      etag: 'etag-123',
      names: [{ displayName: 'Ada Lovelace', givenName: 'Ada', familyName: 'Lovelace' }],
      emailAddresses: [{ value: 'ada@example.com', type: 'work' }],
      phoneNumbers: [{ value: '+15551234567', type: 'mobile' }],
      organizations: [{ name: 'Analytical Engines', title: 'Programmer' }],
      birthdays: [{ date: { month: 12, day: 10 } }],
      userDefined: [{ key: 'crmId', value: 'crm-123' }],
      memberships: [{ contactGroupResourceName: 'contactGroups/friends' }]
    });
  });

  it('converts upstream API failures to ServiceError', () => {
    let error = googlePeopleApiError(
      {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: {
            error: {
              message: 'Request had insufficient authentication scopes.'
            }
          }
        }
      },
      'list contacts'
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.data.reason).toBe('google_people_api_error');
    expect(error.data.upstreamStatus).toBe(403);
    expect(error.data.message).toContain('Google People API list contacts failed');
    expect(error.data.message).toContain('insufficient authentication scopes');
  });
});
