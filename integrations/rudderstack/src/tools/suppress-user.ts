import { SlateTool } from 'slates';
import { z } from 'zod';
import { ControlPlaneClient } from '../lib/client';
import { spec } from '../spec';

export let suppressUser = SlateTool.create(spec, {
  name: 'Suppress User',
  key: 'suppress_user',
  description: `Create a user suppression regulation in RudderStack for GDPR/CCPA compliance. Supports two modes:
- **suppress**: Stops collecting data for specified users at the source level.
- **suppress_with_delete**: Stops collecting data and requests deletion from supported cloud-mode destinations.`,
  instructions: [
    'Use sourceIds with "suppress" regulation type.',
    'Use destinationIds with "suppress_with_delete" regulation type — do not mix sourceIds and destinationIds.',
    'userId is mandatory for each user in the users array.'
  ],
  constraints: [
    'Enterprise feature. Downstream deletion fulfillment must be verified separately. Omitting sourceIds or destinationIds applies to all corresponding resources in the workspace. Cancellation cannot restore deleted data.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      regulationType: z
        .enum(['suppress', 'suppress_with_delete'])
        .describe('Type of regulation to create'),
      sourceIds: z
        .array(z.string())
        .optional()
        .describe('Source IDs to suppress (used with "suppress" type)'),
      destinationIds: z
        .array(z.string())
        .optional()
        .describe('Destination IDs to delete from (used with "suppress_with_delete" type)'),
      users: z
        .array(
          z.object({
            userId: z.string().describe('User ID to suppress'),
            email: z.string().optional().describe('User email address'),
            phone: z.string().optional().describe('User phone number')
          })
        )
        .describe('Users to apply the regulation to')
    })
  )
  .output(
    z.object({
      regulationId: z.string().optional().describe('ID of the created regulation'),
      success: z.boolean().describe('Whether the regulation was created')
    })
  )
  .handleInvocation(async ctx => {
    let client = new ControlPlaneClient({ token: ctx.auth.token, region: ctx.config.region });
    let result = await client.createRegulation(ctx.input);
    let id = result.regulationId ?? result.id;
    return {
      output: { regulationId: typeof id === 'string' ? id : undefined, success: true },
      message:
        'RudderStack accepted the regulation. This does not confirm completion of downstream deletion; verify fulfillment with each destination. Some acknowledgements do not include an ID; list regulations to discover it.'
    };
  })
  .build();
