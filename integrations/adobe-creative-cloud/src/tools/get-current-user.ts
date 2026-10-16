import { SlateTool } from 'slates';
import { z } from 'zod';
import { createAdobeAxios } from '../lib/client';
import { spec } from '../spec';

export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description: 'Retrieve the Adobe identity associated with the current user access token.',
  authMethods: ['oauth_personal', 'oauth_enterprise'],
  constraints: ['Requires a user OAuth connection with the relevant profile scopes.'],
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      profile: z.any().describe('Adobe user profile returned by the identity service')
    })
  )
  .handleInvocation(async ctx => {
    let http = createAdobeAxios('https://ims-na1.adobelogin.com', ctx.auth);
    let response = await http.get('/ims/userinfo/v2');
    return {
      output: { profile: response.data },
      message: 'Retrieved the current Adobe user profile.'
    };
  })
  .build();
