import { createAxios } from 'slates';
import { norgesBankApiError } from './errors';
import type {
  ExchangeBaseCurrency,
  Frequency,
  GenericInstrumentType,
  GenericTenor,
  NorgesBankLocale
} from './options';

export type RawSdmxJson = {
  meta: unknown;
  data: unknown;
  [key: string]: unknown;
};

type ExchangeRatesRequest = {
  frequency: Frequency;
  baseCurrencies: readonly ExchangeBaseCurrency[];
  startPeriod: string;
  endPeriod: string;
  locale: NorgesBankLocale;
};

type GenericRatesRequest = {
  frequency: Frequency;
  tenors: readonly GenericTenor[];
  instrumentTypes: readonly GenericInstrumentType[];
  startPeriod: string;
  endPeriod: string;
  locale: NorgesBankLocale;
};

let http = createAxios({
  baseURL: 'https://data.norges-bank.no/api/data'
});

http.interceptors.response.use(
  response => response,
  error => Promise.reject(norgesBankApiError(error))
);

let requestParams = (params: {
  startPeriod: string;
  endPeriod: string;
  locale: NorgesBankLocale;
}) => ({
  apisrc: 'qb',
  format: 'sdmx-json',
  startPeriod: params.startPeriod,
  endPeriod: params.endPeriod,
  locale: params.locale
});

export class NorgesBankClient {
  async getExchangeRates(params: ExchangeRatesRequest): Promise<RawSdmxJson> {
    try {
      let response = await http.get(
        `/EXR/${params.frequency}.${params.baseCurrencies.join('+')}.NOK.SP`,
        {
          params: requestParams(params)
        }
      );

      return response.data;
    } catch (error) {
      throw norgesBankApiError(error, 'exchange rates request');
    }
  }

  async getGenericRates(params: GenericRatesRequest): Promise<RawSdmxJson> {
    try {
      let response = await http.get(
        `/GOVT_GENERIC_RATES/${params.frequency}.${params.tenors.join('+')}.${params.instrumentTypes.join('+')}.`,
        {
          params: requestParams(params)
        }
      );

      return response.data;
    } catch (error) {
      throw norgesBankApiError(error, 'generic rates request');
    }
  }
}
