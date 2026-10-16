import { buildApiServiceError, createApiServiceError, createAxios, SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Retrieve the signed-in Foursquare user profile through the V2 user API. Requires a V2 OAuth connection; Places service/API keys do not represent a user.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(z.object({ user: z.record(z.string(), z.unknown()), response: z.unknown() }))
  .handleInvocation(async ctx => {
    if (ctx.auth.credentialType === 'service_key') {
      throw createApiServiceError(
        'Use a V2 OAuth connection for get_current_user. A Places Service API Key does not identify a user.'
      );
    }
    try {
      let api = createAxios({ baseURL: 'https://api.foursquare.com/v2' });
      let { data } = await api.get('/users/self', {
        params: { oauth_token: ctx.auth.token, v: '20231010' }
      });
      if (!data.response?.user)
        throw createApiServiceError(
          'Foursquare did not return a user profile. Connect using V2 OAuth.'
        );
      return {
        output: { user: data.response.user, response: data },
        message: 'Retrieved the current user profile.'
      };
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Foursquare',
        reason: 'foursquare_user_request_failed',
        operation: 'get current user',
        extractResponse: (failure, helpers) => helpers.getResponseWithBody(failure),
        detailKeys: ['errorDetail', 'errorType', 'message', 'error'],
        nestedKeys: ['meta', 'errors']
      });
    }
  })
  .build();
