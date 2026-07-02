import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  formatContact,
  getContactRecipe,
  googlePeopleApiError,
  listContactsRecipe,
  searchContactsRecipe
} from './index';

describe('google people recipes', () => {
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
