import { SlateTool } from 'slates';
import { z } from 'zod';
import { DriftClient } from '../lib/client';
import { spec } from '../spec';

export let listCustomAttributes = SlateTool.create(spec, {
  name: 'List Custom Attributes',
  key: 'list_custom_attributes',
  description: `List custom contact attributes configured in Drift. Use this before creating or updating contacts when you need the internal field names for custom attributes.`,
  constraints: ['Requires Drift all_contact_read scope.'],
  tags: {
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      customAttributes: z
        .array(
          z.object({
            name: z.string().optional().describe('Internal custom attribute name'),
            displayName: z.string().optional().describe('Display name shown in Drift'),
            type: z.string().optional().describe('Attribute type')
          })
        )
        .describe('Custom contact attributes configured in Drift'),
      attributeCount: z.number().describe('Number of custom attributes returned')
    })
  )
  .handleInvocation(async ctx => {
    let client = new DriftClient(ctx.auth.token);
    let attributes = await client.listCustomAttributes();

    let customAttributes = attributes.map((attribute: any) => ({
      name: attribute.name,
      displayName: attribute.displayName,
      type: attribute.type
    }));

    return {
      output: {
        customAttributes,
        attributeCount: customAttributes.length
      },
      message: `Retrieved **${customAttributes.length}** custom contact attribute(s).`
    };
  })
  .build();
