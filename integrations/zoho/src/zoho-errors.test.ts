import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import { createZohoAxios } from './lib/client';

describe('Zoho Axios error mapping', () => {
  it('preserves official nested Projects V3 details through the real interceptor path', async () => {
    let http = createZohoAxios(
      {
        baseURL: 'https://projectsapi.zoho.eu/api/v3',
        adapter: async config =>
          Promise.reject({
            name: 'AxiosError',
            message: 'Request failed with status code 400',
            isAxiosError: true,
            config,
            response: {
              status: 400,
              statusText: 'Bad Request',
              headers: {},
              config,
              data: {
                error: {
                  details: [{ message: 'The project ID is invalid.' }],
                  title: 'Invalid input',
                  error_type: 'VALIDATION_ERROR'
                }
              }
            },
            toJSON: () => ({})
          })
      },
      'Projects request'
    );

    // The request interceptor needs an invocation context in production. This
    // test isolates the real adapter and ordered response-interceptor pipeline.
    http.interceptors.request.clear();

    let error = await http.get('/portals').catch(reason => reason);

    expect(error).toBeInstanceOf(ServiceError);
    expect(error.message).toContain('The project ID is invalid.');
    expect(error.message).toContain('Invalid input');
    expect(error.message).toContain('VALIDATION_ERROR');
    expect(error.data.upstreamStatus).toBe(400);
  });
});
