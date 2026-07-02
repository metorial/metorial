import { createAxios } from 'slates';
import { codaApiError } from './errors';

export const CODA_API_BASE_URL = 'https://coda.io/apis/v1';

export let createCodaHttp = () => {
  let http = createAxios({
    baseURL: CODA_API_BASE_URL
  });

  http.interceptors.response.use(
    response => response,
    error => Promise.reject(codaApiError(error))
  );

  return http;
};
