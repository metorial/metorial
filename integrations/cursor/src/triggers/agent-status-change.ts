import crypto from 'crypto';
import {
  decodeWebhookWireBody,
  getWebhookHeaderValues,
  SlateTrigger,
  type WebhookWireRequest
} from 'slates';
import { z } from 'zod';
import { spec } from '../spec';

export let verifyCursorWebhook = async (ctx: {
  input: { originalRequest: WebhookWireRequest };
  secrets: Record<string, { value: string } | undefined>;
}) => {
  let secret = ctx.secrets.cursor_webhook_secret?.value;
  let signatures = getWebhookHeaderValues(ctx.input.originalRequest, 'x-webhook-signature');
  let body = decodeWebhookWireBody(ctx.input.originalRequest.body);
  if (!secret || signatures.length !== 1 || body === null) {
    return { status: 'rejected' as const, code: 'credential_missing' as const };
  }
  let supplied = signatures[0]!;
  let expected = `sha256=${crypto.createHmac('sha256', secret).update(body).digest('hex')}`;
  let suppliedBytes = Buffer.from(supplied, 'utf8');
  let expectedBytes = Buffer.from(expected, 'utf8');
  if (
    suppliedBytes.length !== expectedBytes.length ||
    !crypto.timingSafeEqual(suppliedBytes, expectedBytes)
  ) {
    return { status: 'rejected' as const, code: 'credential_invalid' as const };
  }
  return { status: 'accepted' as const, selection: { scope: 'receiver_trigger' as const } };
};

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
    http: {
      methods: ['POST'],
      ingress: {
        kind: 'receiver_route',
        baseline: 'receiver_path_secret',
        verification: {
          mechanism: 'provider',
          baseline: 'receiver_path_secret',
          reason: 'Cursor signs the exact callback body with a receiver-bound secret.',
          allowedSecretRefs: [
            {
              source: 'generated',
              name: 'cursor_webhook_secret',
              binding: 'receiver_trigger',
              encoding: 'utf8'
            }
          ],
          rules: [
            {
              id: 'cursor.delivery.v1',
              phase: 'delivery',
              when: { methods: ['POST'], registrationStatuses: ['registered'] },
              verify: {
                type: 'provider',
                verifierId: 'cursor.delivery.v1',
                allowedSecretRefs: ['cursor_webhook_secret'],
                allowedBootstrapCaptureRefs: []
              },
              result: { type: 'dispatch', scope: 'receiver_trigger' },
              replay: {
                kind: 'enforced',
                freshness: {
                  source: 'json_pointer',
                  pointer: '/timestamp',
                  format: 'rfc3339',
                  maxAgeSeconds: 600,
                  maxFutureSkewSeconds: 60
                },
                deduplicate: {
                  source: 'json_pointer',
                  pointer: '/id',
                  ttlSeconds: 86_400,
                  scope: 'request'
                }
              }
            }
          ]
        }
      }
    },
    verifyWebhook: verifyCursorWebhook,
    handleRequest: async ctx => {
      let body = await ctx.request.text();
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
