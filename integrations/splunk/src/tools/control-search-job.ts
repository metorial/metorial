import { SlateTool } from 'slates';
import { z } from 'zod';
import { createSplunkClient } from '../lib/helpers';
import { spec } from '../spec';

let namespaceSchema = z
  .object({
    owner: z.string().optional().describe('Namespace owner (username)'),
    app: z.string().optional().describe('Namespace app context')
  })
  .optional()
  .describe('Optional app/owner namespace context');

export let controlSearchJob = SlateTool.create(spec, {
  name: 'Control Search Job',
  key: 'control_search_job',
  description: `Control a running or retained Splunk search job. Use this to cancel, finalize, pause, resume, or touch an async search job created by Run Search.`,
  instructions: [
    'Use "cancel" to stop and remove a job that is no longer needed.',
    'Use "finalize" to stop a running search and keep available results.',
    'Use "touch" to extend the job artifact lifetime.'
  ],
  tags: { destructive: false }
})
  .input(
    z.object({
      searchId: z.string().describe('Search job ID returned from Run Search in async mode'),
      action: z
        .enum(['cancel', 'finalize', 'pause', 'unpause', 'touch'])
        .describe('Control action to apply to the search job'),
      namespace: namespaceSchema
    })
  )
  .output(
    z.object({
      searchId: z.string().describe('The controlled search job ID'),
      action: z.string().describe('The action applied to the search job')
    })
  )
  .handleInvocation(async ctx => {
    let client = createSplunkClient(ctx);
    let result = await client.controlSearchJob(
      ctx.input.searchId,
      ctx.input.action,
      ctx.input.namespace
    );

    return {
      output: result,
      message: `Applied **${ctx.input.action}** to search job **${ctx.input.searchId}**.`
    };
  })
  .build();
