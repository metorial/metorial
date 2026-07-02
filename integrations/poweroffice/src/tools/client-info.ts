import { SlateTool } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';
import {
  arrayValue,
  compactOutput,
  createClient,
  rawRecordSchema,
  stringValue
} from './shared';

export let powerofficeGetClientIntegrationInfo = SlateTool.create(spec, {
  name: 'Get PowerOffice Client Integration Info',
  key: 'poweroffice_get_client_integration_info',
  description:
    'Retrieve PowerOffice client identity, active subscriptions, and valid or invalid API privileges for the authenticated integration instance.',
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      clientId: z.string().optional().describe('PowerOffice client identifier.'),
      clientName: z.string().optional().describe('PowerOffice client name.'),
      activeClientSubscriptions: z
        .array(z.unknown())
        .optional()
        .describe('Active PowerOffice subscriptions for this client.'),
      validPrivileges: z
        .array(z.unknown())
        .optional()
        .describe('API privileges currently valid for this integration.'),
      invalidPrivileges: z
        .array(z.unknown())
        .optional()
        .describe('API privileges unavailable because of subscription or approval state.'),
      record: rawRecordSchema
    })
  )
  .handleInvocation(async ctx => {
    let client = createClient(ctx);
    let info = await client.getClientIntegrationInfo();

    return {
      output: {
        ...compactOutput({
          clientId: stringValue(info, 'ClientId'),
          clientName: stringValue(info, 'ClientName'),
          activeClientSubscriptions: arrayValue(info, 'ActiveClientSubscriptions'),
          validPrivileges: arrayValue(info, 'ValidPrivileges'),
          invalidPrivileges: arrayValue(info, 'InvalidPrivileges')
        }),
        record: info
      },
      message: `Retrieved PowerOffice integration info for **${stringValue(info, 'ClientName') ?? stringValue(info, 'ClientId') ?? 'client'}**.`
    };
  })
  .build();
