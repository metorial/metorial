import { SlateTool } from 'slates';
import { z } from 'zod';
import { clientConfig, TrayGraphqlClient, TrayRestClient } from '../lib/client';
import { spec } from '../spec';
export const getResource = SlateTool.create(spec, {
  key: 'get_resource',
  name: 'Get Resource',
  description:
    'Read one exact external user, solution template or authentication metadata record. Discover IDs through List Users, List Solutions or List Authentications. User and solution reads require a master token. Authentication reads omit credentials.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resourceType: z.enum(['user', 'solution', 'authentication']),
      resourceId: z.string().describe('Exact native ID from the corresponding discovery tool')
    })
  )
  .output(
    z.object({
      resourceType: z.enum(['user', 'solution', 'authentication']),
      resourceId: z.string(),
      user: z
        .object({
          id: z.string(),
          name: z.string(),
          externalUserId: z.string(),
          isTestUser: z.boolean().optional()
        })
        .optional(),
      solution: z
        .object({
          solutionId: z.string(),
          title: z.string(),
          description: z.string().optional(),
          tags: z.array(z.string()),
          configSlots: z
            .array(
              z.object({
                externalId: z.string(),
                title: z.string(),
                defaultValue: z.unknown().optional()
              })
            )
            .optional()
        })
        .optional(),
      authentication: z
        .object({
          authenticationId: z.string(),
          name: z.string(),
          serviceEnvironmentId: z.string(),
          scopes: z.array(z.string()).optional()
        })
        .optional()
    })
  )
  .handleInvocation(async ctx => {
    const credential = clientConfig(ctx);
    const output =
      ctx.input.resourceType === 'user'
        ? { user: await new TrayGraphqlClient(credential).getUser(ctx.input.resourceId) }
        : ctx.input.resourceType === 'solution'
          ? {
              solution: await new TrayGraphqlClient(credential).getSolution(
                ctx.input.resourceId
              )
            }
          : {
              authentication: await new TrayRestClient(credential).getAuthentication(
                ctx.input.resourceId
              )
            };
    return {
      output: {
        resourceType: ctx.input.resourceType,
        resourceId: ctx.input.resourceId,
        ...output
      },
      message: `Retrieved exact ${ctx.input.resourceType} metadata.`
    };
  })
  .build();
