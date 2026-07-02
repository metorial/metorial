import { SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let getMetadata = SlateTool.create(spec, {
  name: 'Get Metadata',
  key: 'get_metadata',
  description: `Retrieves the complete schema of custom fields, meta attributes, and marketing audiences configured in your SuiteDash account. Use this to discover available CRM Contact Custom Fields, CRM Company Custom Fields, Project Custom Fields, and Marketing Audience subscription options before creating or updating records.`,
  instructions: [
    'Call this tool first to discover the available custom fields for your account before using Create Contact, Update Contact, or Subscribe to Marketing Audience.'
  ],
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(z.object({}))
  .output(
    z.object({
      metadata: z
        .record(z.string(), z.unknown())
        .describe(
          'The complete metadata schema including custom fields, meta attributes, and marketing audiences'
        )
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({
      publicId: ctx.auth.publicId,
      secretKey: ctx.auth.secretKey
    });

    let result = await client.getContactMeta();

    return {
      output: { metadata: result },
      message: `Retrieved account metadata schema.`
    };
  })
  .build();
