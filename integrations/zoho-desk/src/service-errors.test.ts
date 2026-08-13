import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { manageArticle } from './tools/manage-article';
import { manageTimeEntry } from './tools/manage-time-entry';

let rejectedError = (promise: Promise<unknown>) =>
  promise.then(
    () => undefined,
    error => error
  );

let context = {
  auth: { token: 'test-token', apiDomain: 'https://desk.zoho.com' },
  config: { orgId: 'test-org' }
};

describe('Zoho Desk tool validation errors', () => {
  it('returns ServiceError when article routing identifiers are missing', async () => {
    let error = await rejectedError(
      manageArticle.handleInvocation({ ...context, input: {} } as never)
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect((error as Error).message).toContain(
      'Either articleId (to update/retrieve) or categoryId (to create) must be provided'
    );
  });

  it('returns ServiceError when time-entry routing identifiers are missing', async () => {
    let error = await rejectedError(
      manageTimeEntry.handleInvocation({ ...context, input: {} } as never)
    );

    expect(error).toBeInstanceOf(ServiceError);
    expect((error as Error).message).toContain(
      'Either timeEntryId (to update/retrieve) or ticketId (to create) must be provided'
    );
  });
});
