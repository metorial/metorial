import { createApiServiceError, isApiErrorRecord, SlateTool } from 'slates';
import { z } from 'zod';
import { RaiselyClient } from '../lib/client';
import { spec } from '../spec';

let identitySchema = z.object({
  uuid: z.string().optional(),
  organisationUuid: z.string().optional(),
  email: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  fullName: z.string().optional(),
  isAdmin: z.boolean().optional()
});

export let getCurrentUser = SlateTool.create(spec, {
  name: 'Get Current User',
  key: 'get_current_user',
  description:
    'Confirm the connected Raisely account and retrieve its user identity, organization UUID, assigned campaign UUIDs, and token roles.',
  tags: { readOnly: true }
})
  .input(z.object({}))
  .output(
    z.object({
      user: identitySchema,
      campaigns: z.array(z.string()).optional(),
      roles: z.array(z.string()).optional(),
      permission: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    let client = new RaiselyClient({ token: ctx.auth.token });
    let result = await client.authenticate();
    if (!isApiErrorRecord(result) || !isApiErrorRecord(result.data)) {
      throw createApiServiceError('Raisely returned an invalid account identity response.');
    }
    let parsed = identitySchema.safeParse({
      uuid: result.data.uuid,
      organisationUuid: result.data.organisationUuid,
      email: result.data.email,
      firstName: result.data.firstName,
      lastName: result.data.lastName,
      fullName: result.data.fullName,
      isAdmin: result.data.isAdmin
    });
    let metadata = z
      .object({
        campaigns: z.array(z.string()).optional(),
        roles: z.array(z.string()).optional(),
        permission: z.string().optional()
      })
      .safeParse({
        campaigns: result.campaigns,
        roles: result.roles,
        permission: result.permission
      });
    if (!parsed.success || !metadata.success) {
      throw createApiServiceError('Raisely returned an invalid account identity response.');
    }
    return {
      output: { user: parsed.data, ...metadata.data },
      message: 'Retrieved the connected Raisely account identity.'
    };
  })
  .build();
