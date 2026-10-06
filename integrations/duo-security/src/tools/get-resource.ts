import { pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { DuoClient } from '../lib/client';
import { validateInput } from '../lib/contracts';
import { spec } from '../spec';

export const getResource = SlateTool.create(spec, {
  name: 'Get Resource',
  key: 'get_resource',
  description:
    'Read exact Duo group, phone, administrator or protected application details using an ID from its list tool. Requires the corresponding Admin API read permission.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['group', 'phone', 'admin', 'integration']),
      resourceId: z
        .string()
        .describe('Exact ID from List Groups, List Phones, List Admins or List Integrations')
    })
  )
  .output(
    z.object({
      resourceId: z.string(),
      resource: z.enum(['group', 'phone', 'admin', 'integration']),
      details: z.record(z.string(), z.unknown())
    })
  )
  .handleInvocation(async ctx => {
    validateInput('get_resource', ctx.input, [ctx.auth.secretKey]);
    const client = new DuoClient(ctx.auth),
      id = ctx.input.resourceId;
    const result =
      ctx.input.resource === 'group'
        ? await client.getGroup(id)
        : ctx.input.resource === 'phone'
          ? await client.getPhone(id)
          : ctx.input.resource === 'admin'
            ? await client.getAdmin(id)
            : await client.getIntegration(id);
    const row = result.response;
    const fields =
      ctx.input.resource === 'group'
        ? [
            'group_id',
            'name',
            'desc',
            'status',
            'push_enabled',
            'sms_enabled',
            'voice_enabled',
            'mobile_otp_enabled'
          ]
        : ctx.input.resource === 'phone'
          ? [
              'phone_id',
              'number',
              'name',
              'type',
              'platform',
              'activated',
              'model',
              'last_seen',
              'users'
            ]
          : ctx.input.resource === 'admin'
            ? [
                'admin_id',
                'name',
                'email',
                'phone',
                'role',
                'role_id',
                'status',
                'created',
                'last_login'
              ]
            : [
                'integration_key',
                'name',
                'type',
                'groups_allowed',
                'notes',
                'self_service_allowed',
                'username_normalization_policy',
                'adminapi_read_resource',
                'adminapi_write_resource',
                'adminapi_read_log',
                'adminapi_info',
                'adminapi_settings',
                'adminapi_admins',
                'adminapi_admins_read'
              ];
    const details = pickDefined(Object.fromEntries(fields.map(key => [key, row[key]])));
    return {
      output: { resourceId: id, resource: ctx.input.resource, details },
      message: `Retrieved ${ctx.input.resource} ${id}.`
    };
  })
  .build();
