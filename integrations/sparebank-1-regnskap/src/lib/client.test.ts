import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { SpareBankRegnskapAuthOutput } from '../auth';

let axiosMocks = vi.hoisted(() => ({
  bizApi: {
    get: vi.fn()
  },
  appFrameworkApi: {
    get: vi.fn()
  },
  filesApi: {
    get: vi.fn()
  },
  createAuthenticatedAxios: vi.fn(),
  createAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();

  return {
    ...actual,
    createAuthenticatedAxios: axiosMocks.createAuthenticatedAxios,
    createAxios: axiosMocks.createAxios
  };
});

import { SpareBankRegnskapClient } from './client';

let auth: SpareBankRegnskapAuthOutput = {
  token: 'token',
  environment: 'sb1',
  environmentName: 'SpareBank 1 Regnskap',
  baseUrl: 'https://regnskap.sb1.no/',
  appFrameworkUrl: 'https://regnskap.sb1.no/',
  identityUrl: 'https://login.regnskap.sparebank1.no/',
  filesUrl: 'https://files.regnskap.sb1.no/'
};

let createClient = () => new SpareBankRegnskapClient(auth);

beforeEach(() => {
  axiosMocks.bizApi.get.mockReset();
  axiosMocks.appFrameworkApi.get.mockReset();
  axiosMocks.filesApi.get.mockReset();
  axiosMocks.createAuthenticatedAxios.mockReset();
  axiosMocks.createAxios.mockReset();

  axiosMocks.createAuthenticatedAxios
    .mockReturnValueOnce(axiosMocks.bizApi)
    .mockReturnValueOnce(axiosMocks.appFrameworkApi);
  axiosMocks.createAxios.mockReturnValue(axiosMocks.filesApi);
});

describe('SpareBankRegnskapClient listCompanies', () => {
  it('wraps the documented bare company object response as a one-item list', async () => {
    let company = {
      Name: 'Company Inc.',
      Key: '015eb513-753a-4942-9f6a-8ba930e33dc6',
      WebHookSubscriberId: null,
      IsTest: false,
      FileFlowEmail: null,
      ID: 5,
      Deleted: false,
      CreatedAt: '2017-02-01T15:55:43.46Z',
      UpdatedAt: null,
      CreatedBy: null,
      UpdatedBy: null
    };
    axiosMocks.appFrameworkApi.get.mockResolvedValueOnce({ data: company });

    let result = await createClient().listCompanies();

    expect(result).toEqual([company]);
    expect(axiosMocks.appFrameworkApi.get).toHaveBeenCalledWith('/api/init/companies');
  });

  it('keeps array company responses unchanged', async () => {
    let companies = [
      {
        Name: 'Company Inc.',
        Key: '015eb513-753a-4942-9f6a-8ba930e33dc6',
        IsTest: false,
        ID: 5
      }
    ];
    axiosMocks.appFrameworkApi.get.mockResolvedValueOnce({ data: companies });

    await expect(createClient().listCompanies()).resolves.toEqual(companies);
  });
});
