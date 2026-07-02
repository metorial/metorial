import type { AxiosInstance, CreateAxiosDefaults, InternalAxiosRequestConfig } from 'axios';
import baseAxios, { getAdapter, isAxiosError } from 'axios';
import { getCurrentContext } from '../context/hook';
import type { SlateAxiosErrorOptions } from '../error';
import { SlateError } from '../error';
import {
  attachHttpTraceDraft,
  recordHttpTraceFromError,
  recordHttpTraceFromResponse
} from './trace';

export interface SlateAxiosDefaults extends CreateAxiosDefaults {
  errorMapping?: SlateAxiosErrorOptions;
}

let applySlateInterceptors = (
  instance: AxiosInstance,
  errorMapping?: SlateAxiosErrorOptions
) => {
  instance.interceptors.request.use(
    request => {
      // Has to be called in the context of an action execution
      let ctx = getCurrentContext();
      let spec = ctx.specification;
      let providerToken = spec.key.replace(/[^A-Za-z0-9!#$%&'*+\-.^_`|~]/g, '-');

      request.headers.set('User-Agent', `slates.dev/1.0.0 ${providerToken || 'unknown'}`);
      request.headers.set('X-Slates-Provider', spec.key);

      let tracedRequest = attachHttpTraceDraft(request, ctx) as InternalAxiosRequestConfig & {
        __slatesTraceAdapterWrapped?: boolean;
      };

      if (!tracedRequest.__slatesTraceAdapterWrapped) {
        let adapter = getAdapter(tracedRequest.adapter ?? baseAxios.defaults.adapter);
        tracedRequest.adapter = async config => {
          try {
            let response = await adapter(config);
            return recordHttpTraceFromResponse(response);
          } catch (error) {
            if (isAxiosError(error)) {
              recordHttpTraceFromError(error);
            }
            throw error;
          }
        };
        tracedRequest.__slatesTraceAdapterWrapped = true;
      }

      return tracedRequest;
    },
    error => Promise.reject(error)
  );

  instance.interceptors.response.use(
    response => response,
    error => Promise.reject(SlateError.fromAxios(error, errorMapping))
  );
};

applySlateInterceptors(baseAxios);

export let createAxios = (config?: SlateAxiosDefaults) => {
  let { errorMapping, ...axiosConfig } = config ?? {};
  let instance = baseAxios.create({
    ...axiosConfig,
    headers: {
      ...axiosConfig.headers
    }
  });

  applySlateInterceptors(instance, errorMapping);
  return instance;
};

export let axios = createAxios();
