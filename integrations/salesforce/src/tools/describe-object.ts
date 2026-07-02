import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSalesforceClient } from '../lib/client';
import { spec } from '../spec';

export let describeObject = SlateTool.create(spec, {
  name: 'Describe Object',
  key: 'describe_object',
  description: `Retrieve metadata about a Salesforce object type, including its fields, relationships, record types, and supported operations. Use this to discover the schema of any standard or custom object. If no object type is provided, returns a list of all available objects in the org.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      objectType: z
        .string()
        .optional()
        .describe(
          'The Salesforce object type to describe. If omitted, returns a list of all available objects.'
        )
    })
  )
  .output(
    z.object({
      objectDescribe: z
        .record(z.string(), z.any())
        .describe(
          'Full describe metadata including fields, relationships, record types, and supported operations'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = createSalesforceClient({
      instanceUrl: ctx.auth.instanceUrl,
      apiVersion: ctx.config.apiVersion,
      token: ctx.auth.token
    });

    let result: any;

    if (ctx.input.objectType) {
      result = await client.describeObject(ctx.input.objectType);
    } else {
      result = await client.describeGlobal();
    }

    return {
      output: { objectDescribe: result },
      message: ctx.input.objectType
        ? `Described **${ctx.input.objectType}** object with ${result.fields?.length || 0} fields`
        : `Retrieved list of **${result.sobjects?.length || 0}** available objects`
    };
  })
  .build();
