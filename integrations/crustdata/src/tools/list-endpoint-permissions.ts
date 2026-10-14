import { SlateTool } from 'slates';
import { z } from 'zod';
import { CrustdataClient } from '../lib/client';
import { spec } from '../spec';

export let listEndpointPermissions = SlateTool.create(spec, {
  name: 'List Endpoint Permissions',
  key: 'list_endpoint_permissions',
  description:
    'Inspect account access to API endpoints, enabled and disabled response fields, effective rate limits, and per-account credit prices. This request does not consume credits.',
  instructions: [
    'Filter by an exact endpoint path, category, or status to reduce the response size. Permissions cannot be changed through this tool.'
  ],
  tags: { destructive: false, readOnly: true }
})
  .input(
    z.object({
      path: z
        .string()
        .optional()
        .describe(
          'Exact endpoint path with a leading slash, such as /company/enrich. Prefixes do not match.'
        ),
      category: z
        .string()
        .optional()
        .describe(
          'Product category, matched case-insensitively, such as Company, Person, Jobs, Web, or Social.'
        ),
      status: z
        .enum(['enabled', 'disabled'])
        .optional()
        .describe('Return only endpoints with this account access status.')
    })
  )
  .output(
    z.object({
      apiVersion: z.string().describe('API version used by the account response.'),
      tokenLimitRpm: z
        .number()
        .nullable()
        .describe('Aggregate requests-per-minute ceiling, or null when none is set.'),
      endpoints: z
        .array(
          z
            .object({
              path: z.string(),
              category: z.string(),
              status: z.string(),
              effective_rate_limit_rpm: z.number().nullable(),
              fields: z.object({ enabled: z.array(z.string()), disabled: z.array(z.string()) })
            })
            .passthrough()
        )
        .describe(
          'Endpoint access and field permissions, including optional per-account pricing details.'
        )
    })
  )
  .handleInvocation(async ctx => {
    let result = await new CrustdataClient(ctx.auth.token).listEndpointPermissions(ctx.input);
    return {
      output: {
        apiVersion: result.api_version,
        tokenLimitRpm: result.token_limit_rpm,
        endpoints: result.endpoints
      },
      message: `Retrieved permissions for **${result.endpoints.length}** endpoints.`
    };
  })
  .build();
