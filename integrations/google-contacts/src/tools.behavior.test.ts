import { ServiceError } from '@lowerdeck/error';
import { googlePeopleApiError } from '@slates/google-people-recipes';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let clientMocks = vi.hoisted(() => ({
  batchGetContacts: vi.fn(),
  batchUpdateContacts: vi.fn()
}));

vi.mock('./lib/client', () => ({
  Client: class {
    batchGetContacts(...args: unknown[]) {
      return clientMocks.batchGetContacts(...args);
    }

    batchUpdateContacts(...args: unknown[]) {
      return clientMocks.batchUpdateContacts(...args);
    }
  }
}));

import { batchModifyContacts } from './tools/batch-contacts';

let createCtx = (input: Record<string, unknown>) =>
  ({
    input,
    auth: { token: 'test-token' }
  }) as any;

let currentContact = {
  resourceName: 'people/c123',
  etag: 'person-etag-1',
  names: [{ displayName: 'Current Name' }],
  biographies: [{ value: 'Old biography' }],
  metadata: {
    sources: [
      { type: 'CONTACT', id: '123', etag: 'contact-source-etag-1' },
      { type: 'PROFILE', id: 'profile-123', etag: 'profile-source-etag-1' }
    ]
  }
};

let mockCurrentContact = (contact = currentContact) => {
  clientMocks.batchGetContacts.mockResolvedValueOnce({
    responses: [
      {
        requestedResourceName: contact.resourceName,
        person: contact
      }
    ]
  });
};

beforeEach(() => {
  clientMocks.batchGetContacts.mockReset();
  clientMocks.batchUpdateContacts.mockReset();
});

describe('batch_modify_contacts', () => {
  it('omits a selected field to clear it while preserving contact source etags', async () => {
    mockCurrentContact();
    clientMocks.batchUpdateContacts.mockResolvedValueOnce({ updateResult: {} });

    let result = await batchModifyContacts.handleInvocation(
      createCtx({
        action: 'update',
        updateFields: ['biographies'],
        updates: [
          {
            resourceName: currentContact.resourceName,
            etag: currentContact.etag,
            contactData: {}
          }
        ]
      })
    );

    expect(clientMocks.batchGetContacts).toHaveBeenCalledWith(
      [currentContact.resourceName],
      expect.stringContaining('metadata')
    );
    expect(clientMocks.batchUpdateContacts).toHaveBeenCalledWith(
      {
        [currentContact.resourceName]: {
          resourceName: currentContact.resourceName,
          etag: currentContact.etag,
          metadata: { sources: currentContact.metadata.sources }
        }
      },
      'biographies'
    );
    // Google may return an empty updateResult on success; the count falls back
    // to the number of submitted updates instead of reporting zero.
    expect(result.output.count).toBe(1);
    expect(result.message).toBe('Updated **1** contacts.');
  });

  it('re-raises a Google etag-mismatch failure with fresh-etag guidance', async () => {
    mockCurrentContact();
    clientMocks.batchUpdateContacts.mockRejectedValueOnce(
      googlePeopleApiError(
        {
          response: {
            status: 400,
            statusText: 'Bad Request',
            data: {
              error: {
                code: 400,
                status: 'FAILED_PRECONDITION',
                message:
                  'Request person.etag is different than the current person.etag. Clear the etag field or set it to the latest etag.'
              }
            }
          }
        },
        'batch update contacts'
      )
    );

    let invocation = batchModifyContacts.handleInvocation(
      createCtx({
        action: 'update',
        updateFields: ['biographies'],
        updates: [
          {
            resourceName: currentContact.resourceName,
            etag: currentContact.etag,
            contactData: { biographies: [{ value: 'New biography' }] }
          }
        ]
      })
    );

    await expect(invocation).rejects.toBeInstanceOf(ServiceError);
    await expect(invocation).rejects.toThrow(/re-fetch the contacts .* fresh etags/i);
  });

  it('rejects a stale person etag before submitting the batch update', async () => {
    mockCurrentContact();

    let invocation = batchModifyContacts.handleInvocation(
      createCtx({
        action: 'update',
        updateFields: ['biographies'],
        updates: [
          {
            resourceName: currentContact.resourceName,
            etag: 'stale-etag',
            contactData: { biographies: [{ value: 'New biography' }] }
          }
        ]
      })
    );

    await expect(invocation).rejects.toBeInstanceOf(ServiceError);
    expect(clientMocks.batchUpdateContacts).not.toHaveBeenCalled();
  });

  it('requires the contact source etag used by the People API', async () => {
    mockCurrentContact({
      ...currentContact,
      metadata: {
        sources: [{ type: 'PROFILE', id: 'profile-123', etag: 'profile-source-etag-1' }]
      }
    });

    let invocation = batchModifyContacts.handleInvocation(
      createCtx({
        action: 'update',
        updateFields: ['biographies'],
        updates: [
          {
            resourceName: currentContact.resourceName,
            etag: currentContact.etag,
            contactData: { biographies: [{ value: 'New biography' }] }
          }
        ]
      })
    );

    await expect(invocation).rejects.toBeInstanceOf(ServiceError);
    expect(clientMocks.batchUpdateContacts).not.toHaveBeenCalled();
  });

  it('rejects contact data fields omitted from updateFields', async () => {
    mockCurrentContact();

    let invocation = batchModifyContacts.handleInvocation(
      createCtx({
        action: 'update',
        updateFields: ['biographies'],
        updates: [
          {
            resourceName: currentContact.resourceName,
            etag: currentContact.etag,
            contactData: { names: [{ givenName: 'Ignored' }] }
          }
        ]
      })
    );

    await expect(invocation).rejects.toBeInstanceOf(ServiceError);
    expect(clientMocks.batchUpdateContacts).not.toHaveBeenCalled();
  });
});
