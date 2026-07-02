import { SlateTool } from 'slates';
import { z } from 'zod';
import { SnsClient } from '../lib/client';
import { spec } from '../spec';

let originationNumberSchema = z.object({
  createdAt: z.string().optional().describe('Creation timestamp returned by SNS'),
  iso2CountryCode: z.string().optional().describe('ISO 3166-1 alpha-2 country code'),
  numberCapabilities: z
    .array(z.string())
    .describe('Capabilities for the number, such as SMS or VOICE'),
  phoneNumber: z.string().describe('Origination phone number'),
  routeType: z
    .string()
    .optional()
    .describe('Route type, such as Promotional or Transactional'),
  status: z.string().optional().describe('SNS origination number status')
});

export let listOriginationNumbers = SlateTool.create(spec, {
  name: 'List Origination Numbers',
  key: 'list_origination_numbers',
  description: `List dedicated SNS SMS origination numbers and their metadata for the configured AWS account and region.`,
  tags: {
    destructive: false,
    readOnly: true
  }
})
  .input(
    z.object({
      maxResults: z
        .number()
        .int()
        .min(1)
        .max(30)
        .optional()
        .describe('Maximum number of origination numbers to return, 1-30'),
      nextToken: z.string().optional().describe('Pagination token from a previous request')
    })
  )
  .output(
    z.object({
      phoneNumbers: z
        .array(originationNumberSchema)
        .describe('Dedicated SNS SMS origination numbers'),
      nextToken: z
        .string()
        .optional()
        .describe('Token for retrieving the next page of results')
    })
  )
  .handleInvocation(async ctx => {
    let client = new SnsClient({
      accessKeyId: ctx.auth.accessKeyId,
      secretAccessKey: ctx.auth.secretAccessKey,
      sessionToken: ctx.auth.sessionToken,
      region: ctx.config.region
    });

    let result = await client.listOriginationNumbers({
      maxResults: ctx.input.maxResults,
      nextToken: ctx.input.nextToken
    });

    return {
      output: result,
      message: `Found **${result.phoneNumbers.length}** SNS origination number(s)${result.nextToken ? ' (more available)' : ''}`
    };
  })
  .build();
