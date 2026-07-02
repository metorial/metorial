import { SlateTool } from 'slates';
import { z } from 'zod';
import { createDynamicsClient } from '../lib/client';
import { spec } from '../spec';

export let whoAmI = SlateTool.create(spec, {
  name: 'Who Am I',
  key: 'who_am_i',
  description: `Retrieve information about the currently authenticated user, including user ID, organization ID, and business unit ID. Useful for verifying connection and getting the current user context.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      userId: z.string().describe('GUID of the current system user'),
      organizationId: z.string().describe('GUID of the organization'),
      businessUnitId: z.string().describe('GUID of the business unit')
    })
  )
  .handleInvocation(async ctx => {
    let client = createDynamicsClient(ctx);

    let result = (await client.invokeOperation({
      operationType: 'function',
      operationName: 'WhoAmI'
    })) as {
      UserId?: string;
      OrganizationId?: string;
      BusinessUnitId?: string;
    };

    return {
      output: {
        userId: result.UserId ?? '',
        organizationId: result.OrganizationId ?? '',
        businessUnitId: result.BusinessUnitId ?? ''
      },
      message: `Authenticated as user **${result.UserId}** in organization **${result.OrganizationId}**.`
    };
  })
  .build();
