import crypto from 'crypto';
import { SlateTrigger } from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let agentStatusChange = SlateTrigger.create(spec, {
  name: 'Agent Status Change',
  key: 'agent_status_change',
  description:
    'Triggered when a Cursor cloud agent reaches FINISHED or ERROR status. Configure the webhook URL when launching agents using the Launch Agent tool.'
})
  .input(
    z.object({
      event: z.string().describe('Event type (statusChange)'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event'),
      agentId: z.string().describe('ID of the agent'),
      status: z.string().describe('New agent status: FINISHED or ERROR'),
      repository: z.string().optional().describe('Source repository URL'),
      ref: z.string().optional().describe('Source git ref'),
      branchName: z.string().optional().describe('Target branch name'),
      agentUrl: z.string().optional().describe('URL to view the agent'),
      prUrl: z.string().optional().describe('Pull request URL if created'),
      summary: z.string().optional().describe('Summary of work done by the agent')
    })
  )
  .output(
    z.object({
      agentId: z.string().describe('ID of the agent'),
      status: z.string().describe('New agent status: FINISHED or ERROR'),
      repository: z.string().optional().describe('Source repository URL'),
      ref: z.string().optional().describe('Source git ref'),
      branchName: z.string().optional().describe('Target branch name'),
      agentUrl: z.string().optional().describe('URL to view the agent in Cursor'),
      prUrl: z.string().optional().describe('Pull request URL if created'),
      summary: z.string().optional().describe('Summary of work done'),
      timestamp: z.string().describe('ISO 8601 timestamp of the event')
    })
  )
  .webhook({
    handleRequest: async ctx => {
      let signature = ctx.request.headers.get('x-webhook-signature');
      let _webhookId = ctx.request.headers.get('x-webhook-id');
      let body = await ctx.request.text();

      // Verify signature if a secret is configured and signature header is present
      if (signature && ctx.state?.webhookSecret) {
        let expectedSig =
          'sha256=' +
          crypto
            .createHmac('sha256', ctx.state.webhookSecret as string)
            .update(body)
            .digest('hex');

        if (signature !== expectedSig) {
          return { inputs: [] };
        }
      }

      let data = JSON.parse(body);

      return {
        inputs: [
          {
            event: data.event ?? 'statusChange',
            timestamp: data.timestamp ?? new Date().toISOString(),
            agentId: data.id,
            status: data.status,
            repository: data.source?.repository,
            ref: data.source?.ref,
            branchName: data.target?.branchName,
            agentUrl: data.target?.url,
            prUrl: data.target?.prUrl,
            summary: data.summary
          }
        ]
      };
    },

    handleEvent: async ctx => {
      return {
        type: `agent.${ctx.input.status.toLowerCase()}`,
        id: `${ctx.input.agentId}-${ctx.input.timestamp}`,
        output: {
          agentId: ctx.input.agentId,
          status: ctx.input.status,
          repository: ctx.input.repository,
          ref: ctx.input.ref,
          branchName: ctx.input.branchName,
          agentUrl: ctx.input.agentUrl,
          prUrl: ctx.input.prUrl,
          summary: ctx.input.summary,
          timestamp: ctx.input.timestamp
        }
      };
    }
  })
  .build();
