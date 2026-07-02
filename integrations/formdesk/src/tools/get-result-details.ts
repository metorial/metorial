import { SlateTool } from 'slates';
import { z } from 'zod';
import { FormdeskClient } from '../lib/client';
import { spec } from '../spec';

export let getResultDetails = SlateTool.create(spec, {
  name: 'Get Result Details',
  key: 'get_result_details',
  description: `Retrieves the full details of a specific form submission result, including all submitted field data and system metadata. Optionally includes file attachment information.`,
  tags: {
    readOnly: true
  }
})
  .input(
    z.object({
      resultId: z.string().describe('The unique ID of the result entry to retrieve'),
      includeFiles: z
        .boolean()
        .optional()
        .describe('Whether to include file attachment details in the response')
    })
  )
  .output(
    z.object({
      resultId: z.string().describe('The unique ID of the result entry'),
      fields: z
        .record(z.string(), z.any())
        .describe('All submitted field data as key-value pairs'),
      systemFields: z
        .record(z.string(), z.any())
        .optional()
        .describe('System metadata fields (created date, status, etc.)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new FormdeskClient({
      token: ctx.auth.token,
      host: ctx.auth.host,
      domain: ctx.auth.domain
    });

    ctx.progress('Fetching result details...');
    let result = await client.getResult(ctx.input.resultId, ctx.input.includeFiles);

    let fields: Record<string, any> = {};
    let systemFields: Record<string, any> = {};

    if (result && typeof result === 'object') {
      for (let [key, value] of Object.entries(result)) {
        if (
          key.startsWith('_') ||
          ['id', 'status', 'created', 'changed', 'completed', 'visitor', 'ip'].includes(key)
        ) {
          systemFields[key] = value;
        } else {
          fields[key] = value;
        }
      }
    }

    return {
      output: {
        resultId: ctx.input.resultId,
        fields,
        systemFields: Object.keys(systemFields).length > 0 ? systemFields : undefined
      },
      message: `Retrieved details for result **${ctx.input.resultId}** with **${Object.keys(fields).length}** field(s).`
    };
  })
  .build();
