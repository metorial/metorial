import { SlateTool } from 'slates';
import { z } from 'zod';
import { ZixflowClient } from '../lib/client';
import { operationOutput, providerRecords, requireInput } from '../lib/response';
import { spec } from '../spec';

export let getRcsTemplateVariables = SlateTool.create(spec, {
  key: 'get_rcs_template_variables',
  name: 'Get RCS Template Variables',
  description:
    'Discover the variable keys and types for the RCS bot before sending an RCS template. Obtain the bot ID from the RCS settings in Zixflow.',
  tags: { readOnly: true, destructive: false }
})
  .input(
    z.object({
      botId: z.string().describe('RCS bot ID configured in Zixflow'),
      templateName: z.string().describe('Name of the configured RCS template')
    })
  )
  .output(
    z.object({
      success: z.boolean(),
      responseMessage: z.string(),
      variables: z
        .array(z.record(z.string(), z.any()))
        .describe('Variable definitions returned by Zixflow'),
      raw: z.unknown().optional().describe('Complete response returned by Zixflow')
    })
  )
  .handleInvocation(async ctx => {
    requireInput(ctx.input.botId, 'botId');
    requireInput(ctx.input.templateName, 'templateName');
    let result = await new ZixflowClient(ctx.auth).getRcsTemplateVariables(
      ctx.input.botId,
      ctx.input.templateName
    );
    return {
      output: { ...operationOutput(result), variables: providerRecords(result.data) },
      message: 'Retrieved RCS template variables.'
    };
  })
  .build();
