import { describe, expect, it } from 'vitest';
import { mapBulkPersonMatches } from './enrich-person';

describe('mapBulkPersonMatches', () => {
  it('omits null placeholders for records Apollo could not enrich', () => {
    expect(
      mapBulkPersonMatches([
        null,
        {
          id: 'person-1',
          name: 'Ada Lovelace',
          email: 'ada@example.com',
          organization: { name: 'Analytical Engines' }
        },
        null
      ])
    ).toEqual([
      {
        personId: 'person-1',
        firstName: undefined,
        lastName: undefined,
        name: 'Ada Lovelace',
        email: 'ada@example.com',
        title: undefined,
        linkedinUrl: undefined,
        organizationName: 'Analytical Engines'
      }
    ]);
  });
});
