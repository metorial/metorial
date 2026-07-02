import { ServiceError } from '@lowerdeck/error';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  get: vi.fn()
}));

vi.mock('../lib/helpers', () => ({
  createClientFromContext: () => ({
    get: mocks.get
  })
}));

import { finagoGetProfile } from './profile';

let invokeTool = async (input: Record<string, unknown>) =>
  await finagoGetProfile.handleInvocation({
    input,
    auth: { token: 'token' },
    config: {}
  } as any);

let responseForPath = (path: string) => {
  if (path === '/me') return { id: 'profile-id' };
  if (path === '/organization/information') return { id: 123, name: 'Current organization' };
  if (path === '/me/identifiers') return [{ id: 'identifier-id' }];
  if (path === '/me/licenses') return [{ id: 'license-id' }];
  if (path === '/organization/people') return [{ id: 456 }];
  if (path.includes('/organization')) return { id: 'license-organization-id' };
  throw new Error(`Unexpected path ${path}`);
};

describe('finago_get_profile', () => {
  beforeEach(() => {
    mocks.get.mockReset();
    mocks.get.mockImplementation(async (path: string) => responseForPath(path));
  });

  it('reads the profile and documented current organization endpoint by default', async () => {
    let result = await invokeTool({});

    expect(result.output.profile).toEqual({ id: 'profile-id' });
    expect(result.output.organization).toEqual({ id: 123, name: 'Current organization' });
    expect(mocks.get).toHaveBeenCalledTimes(2);
    expect(mocks.get).toHaveBeenNthCalledWith(
      1,
      '/me',
      { thumb: undefined, bigthumb: undefined, maxAge: undefined },
      'read profile'
    );
    expect(mocks.get).toHaveBeenNthCalledWith(
      2,
      '/organization/information',
      undefined,
      'read organization'
    );
  });

  it('forwards documented profile, identifier, license, and people parameters', async () => {
    let result = await invokeTool({
      thumb: true,
      bigthumb: true,
      maxAge: 60,
      identifierType: 'email',
      identifierStatus: 'Confirmed',
      licenseOrganizationId: 123,
      licensePersonId: 456,
      personType: 'Client',
      licenseId: '11111111-1111-4111-8111-111111111111'
    });

    expect(result.output.identifiers).toEqual([{ id: 'identifier-id' }]);
    expect(result.output.licenses).toEqual([{ id: 'license-id' }]);
    expect(result.output.people).toEqual([{ id: 456 }]);
    expect(result.output.peopleCount).toBe(1);
    expect(mocks.get).toHaveBeenNthCalledWith(
      1,
      '/me',
      { thumb: true, bigthumb: true, maxAge: 60 },
      'read profile'
    );
    expect(mocks.get).toHaveBeenNthCalledWith(
      2,
      '/me/licenses/11111111-1111-4111-8111-111111111111/organization',
      undefined,
      'read license organization'
    );
    expect(mocks.get).toHaveBeenNthCalledWith(
      3,
      '/me/identifiers',
      { type: 'email', status: 'Confirmed' },
      'read identifiers'
    );
    expect(mocks.get).toHaveBeenNthCalledWith(
      4,
      '/me/licenses',
      { organizationId: 123, personId: 456 },
      'read licenses'
    );
    expect(mocks.get).toHaveBeenNthCalledWith(
      5,
      '/organization/people',
      { personType: 'Client' },
      'read people'
    );
  });

  it('throws ServiceError for invalid license IDs before calling Finago', async () => {
    await expect(invokeTool({ licenseId: 'not-a-uuid' })).rejects.toBeInstanceOf(ServiceError);
    expect(mocks.get).not.toHaveBeenCalled();
  });
});
