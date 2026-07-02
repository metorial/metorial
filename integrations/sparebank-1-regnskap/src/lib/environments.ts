import { createAxios, requestAxiosData } from 'slates';
import { z } from 'zod';
import { spareBankRegnskapApiError, spareBankRegnskapValidationError } from './errors';

export const SPAREBANK_SHARED_IDENTITY_URL = 'https://login.regnskap.sparebank1.no/';

export const SPAREBANK_ENVIRONMENTS = {
  sb1sornorge: {
    name: 'SpareBank 1 Regnskap Sør-Norge',
    baseUrl: 'https://regnskap.sb1sornorge.no/'
  },
  sb1ostlandet: {
    name: 'SpareBank 1 Regnskap Østlandet',
    baseUrl: 'https://regnskap.sb1ostlandet.no/'
  },
  snn: {
    name: 'SpareBank 1 Regnskap Nord-Norge',
    baseUrl: 'https://regnskap.snn.no/'
  },
  sb1: {
    name: 'SpareBank 1 Regnskap Hallingdal Valdres',
    baseUrl: 'https://regnskap.sb1.no/'
  },
  bank: {
    name: 'SpareBank 1 Regnskap Nordmøre',
    baseUrl: 'https://regnskap.bank.no/'
  },
  sparebank1oa: {
    name: 'SpareBank 1 Regnskap Østfold Akershus',
    baseUrl: 'https://regnskap.sparebank1oa.no/'
  },
  rhbank: {
    name: 'SpareBank 1 Regnskap Ringerike Hadeland',
    baseUrl: 'https://regnskap.rhbank.no/'
  },
  s1g: {
    name: 'SpareBank 1 Regnskap Gudbrandsdal',
    baseUrl: 'https://regnskap.s1g.no/'
  },
  sb1ls: {
    name: 'SpareBank 1 Regnskap Lom og Skjåk',
    baseUrl: 'https://regnskap.sb1ls.no/'
  },
  smn: {
    name: 'SpareBank 1 SMN',
    baseUrl: 'https://regnskap.smn.no/'
  }
} as const;

export type SpareBankEnvironmentKey = keyof typeof SPAREBANK_ENVIRONMENTS;

export let spareBankEnvironmentKeySchema = z
  .enum(
    Object.keys(SPAREBANK_ENVIRONMENTS) as [
      SpareBankEnvironmentKey,
      ...SpareBankEnvironmentKey[]
    ]
  )
  .describe('SpareBank 1 Regnskap environment key.');

export type SpareBankEndpoints = {
  appFrameworkUrl: string;
  identityUrl: string;
  filesUrl: string;
  raw: Record<string, unknown>;
};

let normalizeBaseUrl = (value: string) => {
  let trimmed = value.trim();
  if (!trimmed) {
    throw spareBankRegnskapValidationError('Endpoint URL is empty.');
  }

  return trimmed.endsWith('/') ? trimmed : `${trimmed}/`;
};

let isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

let endpointValue = (raw: Record<string, unknown>, key: string, fallback?: string) => {
  let value = raw[key];
  if (typeof value === 'string' && value.trim()) return normalizeBaseUrl(value);
  if (fallback) return normalizeBaseUrl(fallback);
  throw spareBankRegnskapValidationError(
    `SpareBank 1 Regnskap endpoint discovery did not return ${key}.`
  );
};

export let environmentFromKey = (environment: SpareBankEnvironmentKey) =>
  SPAREBANK_ENVIRONMENTS[environment];

export let discoverEnvironmentEndpoints = async (
  environment: SpareBankEnvironmentKey
): Promise<SpareBankEndpoints> => {
  let selected = environmentFromKey(environment);
  let http = createAxios({
    baseURL: selected.baseUrl,
    headers: {
      Accept: 'application/json'
    }
  });

  let discovered = await requestAxiosData<unknown>(
    'discover SpareBank 1 Regnskap environment endpoints',
    () => http.get('/api/endpoints'),
    spareBankRegnskapApiError
  );
  let raw = isRecord(discovered) ? discovered : {};

  return {
    appFrameworkUrl: endpointValue(raw, 'AppFramework', selected.baseUrl),
    identityUrl: endpointValue(raw, 'Identity', SPAREBANK_SHARED_IDENTITY_URL),
    filesUrl: endpointValue(raw, 'Files'),
    raw
  };
};

export let joinUrl = (baseUrl: string, path: string) =>
  new URL(path.replace(/^\/+/, ''), normalizeBaseUrl(baseUrl)).toString();
