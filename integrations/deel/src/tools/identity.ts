import { anyOf, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { dataList, exactResourceId, objectResponse, resourceSchema } from '../lib/response';
import { createClient } from '../lib/utils';
import { spec } from '../spec';

let organizationSchema = z.object({ id: z.string(), name: z.string() }).passthrough();
export let getCurrentUser = SlateTool.create(spec, {
  key: 'get_current_user',
  name: 'Get Current User',
  description:
    'Read the profile of the authenticated user, including organization membership. Organization service tokens may not have a personal profile; use get_current_organization for organization identity.',
  tags: { readOnly: true }
})
  .scopes(anyOf('people:read', 'worker:read'))
  .input(z.object({}))
  .output(z.object({ profile: resourceSchema }))
  .handleInvocation(async ctx => {
    let profile = objectResponse(await createClient(ctx).getCurrentUser(), 'current user');
    if (profile.id == null && profile.user_id == null)
      throw createApiServiceError(
        'Deel did not return an authenticated user identity. Use get_current_organization with an organization token.'
      );
    exactResourceId(profile.id ?? profile.user_id);
    return { output: { profile }, message: 'Retrieved the current user profile.' };
  })
  .build();

export let getCurrentOrganization = SlateTool.create(spec, {
  key: 'get_current_organization',
  name: 'Get Current Organization',
  description:
    'Read the organization associated with the authentication token, including its ID and name. No organization ID is required.',
  tags: { readOnly: true }
})
  .scopes(anyOf('organizations:read'))
  .input(z.object({}))
  .output(z.object({ organizations: z.array(organizationSchema) }))
  .handleInvocation(async ctx => {
    let parsed = z
      .array(organizationSchema)
      .safeParse(
        dataList(await createClient(ctx).getCurrentOrganization(), 'current organization')
      );
    if (!parsed.success)
      throw createApiServiceError('Deel returned invalid organization identity data.');
    let organizations = parsed.data;
    if (!organizations.length)
      throw createApiServiceError('Deel did not return an organization for this token.');
    return {
      output: { organizations },
      message: `Retrieved ${organizations.length} authorized organization(s).`
    };
  })
  .build();
