import { SlateTool } from 'slates';
import { getClient } from '../lib/client';
import { invalid, one, resourceId, z } from '../lib/schemas';
import { spec } from '../spec';
export const getResource = SlateTool.create(spec, {
  key: 'get_resource',
  name: 'Get Resource',
  description:
    'Read one membership tier or staff user by its exact native ID. Discover IDs with browse_tiers or browse_users. Staff user reads require Admin credentials.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      resource: z.enum(['tier', 'user']),
      resourceId: resourceId.describe('Exact native ID from browse_tiers or browse_users.'),
      include: z.string().optional(),
      fields: z.string().optional(),
      api: z.enum(['admin', 'content']).optional()
    })
  )
  .output(
    z.object({
      resource: z.enum(['tier', 'user']),
      resourceId: z.string(),
      name: z.string().optional(),
      slug: z.string().optional(),
      description: z.string().nullable().optional(),
      email: z.string().optional(),
      type: z.string().optional(),
      active: z.boolean().optional(),
      visibility: z.string().optional(),
      currency: z.string().nullable().optional(),
      monthlyPrice: z.number().nullable().optional(),
      yearlyPrice: z.number().nullable().optional(),
      benefits: z.array(z.string()).nullable().optional(),
      updatedAt: z.string().nullable().optional()
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.resourceId === 'me')
      throw invalid(
        'Use get_current_context for authenticated staff identity, or a native user ID from browse_users.'
      );
    const client = getClient(ctx, ctx.input.api);
    const key = ctx.input.resource === 'tier' ? 'tiers' : 'users';
    const options = { include: ctx.input.include, fields: ctx.input.fields };
    const row = one(
      ctx.input.resource === 'tier'
        ? await client.readTier(ctx.input.resourceId, options)
        : await client.readUser(ctx.input.resourceId, options),
      key,
      { id: ctx.input.resourceId }
    );
    return {
      output: {
        resource: ctx.input.resource,
        resourceId: row.id,
        name: row.name,
        slug: row.slug,
        description: row.description,
        email: row.email,
        type: row.type,
        active: row.active,
        visibility: row.visibility,
        currency: row.currency,
        monthlyPrice: row.monthly_price,
        yearlyPrice: row.yearly_price,
        benefits: row.benefits,
        updatedAt: row.updated_at
      },
      message: 'Retrieved the exact Ghost resource.'
    };
  })
  .build();
