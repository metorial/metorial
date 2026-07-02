import { SlateTool } from '@slates/provider';
import { z } from 'zod';
import { pipedriveServiceError } from '../lib/errors';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

let wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

let asString = (value: unknown) => {
  if (typeof value === 'string' && value.trim()) {
    return value;
  }

  return undefined;
};

let asNumber = (value: unknown) => {
  if (typeof value === 'number') {
    return value;
  }

  if (typeof value === 'string') {
    let parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

export let convertLeadToDeal = SlateTool.create(spec, {
  name: 'Convert Lead To Deal',
  key: 'convert_lead_to_deal',
  description: `Convert a Pipedrive lead into a deal. The conversion transfers related notes, files, emails, and activities to the created deal when Pipedrive completes the job.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      leadId: z.string().describe('Lead ID to convert'),
      stageId: z.number().optional().describe('Stage ID for the created deal'),
      pipelineId: z
        .number()
        .optional()
        .describe('Pipeline ID for the created deal. Do not combine with stageId.'),
      waitForCompletion: z
        .boolean()
        .optional()
        .describe('Poll conversion status before returning. Defaults to true.'),
      maxStatusChecks: z
        .number()
        .int()
        .min(1)
        .max(20)
        .optional()
        .describe('Maximum status checks when waiting for completion. Defaults to 8.')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Converted lead ID'),
      conversionId: z.string().describe('Pipedrive conversion job ID'),
      status: z.string().optional().describe('Conversion status'),
      dealId: z.number().optional().describe('Created deal ID when conversion completed')
    })
  )
  .handleInvocation(async ctx => {
    if (ctx.input.stageId && ctx.input.pipelineId) {
      throw pipedriveServiceError('Provide either stageId or pipelineId, not both.');
    }

    let client = createClient(ctx);
    let body: Record<string, any> = {};
    if (ctx.input.stageId) body.stage_id = ctx.input.stageId;
    if (ctx.input.pipelineId) body.pipeline_id = ctx.input.pipelineId;

    let conversion = await client.convertLeadToDeal(ctx.input.leadId, body);
    let conversionData = conversion?.data;
    let conversionId =
      asString(conversionData?.id) ??
      asString(conversionData?.conversion_id) ??
      asString(conversionData?.conversionId);

    if (!conversionId) {
      throw pipedriveServiceError('Pipedrive did not return a lead conversion ID.');
    }

    let status: string | undefined;
    let dealId: number | undefined;
    let maxChecks =
      ctx.input.waitForCompletion === false ? 1 : (ctx.input.maxStatusChecks ?? 8);

    for (let attempt = 0; attempt < maxChecks; attempt += 1) {
      let statusResult = await client.getLeadConversionStatus(ctx.input.leadId, conversionId);
      let statusData = statusResult?.data;
      status = asString(statusData?.status);
      dealId = asNumber(statusData?.deal_id ?? statusData?.dealId);

      if (
        ctx.input.waitForCompletion === false ||
        status === 'completed' ||
        status === 'failed' ||
        status === 'rejected'
      ) {
        break;
      }

      await wait(1000);
    }

    if (status === 'failed' || status === 'rejected') {
      throw pipedriveServiceError(`Pipedrive lead conversion ${status}.`);
    }

    return {
      output: {
        leadId: ctx.input.leadId,
        conversionId,
        status,
        dealId
      },
      message: dealId
        ? `Lead **${ctx.input.leadId}** was converted to deal **#${dealId}**.`
        : `Lead **${ctx.input.leadId}** conversion started with status **${status ?? 'unknown'}**.`
    };
  });
