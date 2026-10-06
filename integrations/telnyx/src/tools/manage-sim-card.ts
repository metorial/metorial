import { SlateTool } from 'slates';
import { z } from 'zod';
import { TelnyxClient } from '../lib/client';
import { spec } from '../spec';

export let manageSimCard = SlateTool.create(spec, {
  name: 'Manage SIM Card',
  key: 'manage_sim_card',
  description: `List, view, update, enable, disable, set to standby, or decommission SIM cards. Use this tool to manage your IoT/wireless SIM card fleet and control connectivity.`,
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      action: z
        .enum([
          'list',
          'get',
          'get_action',
          'update',
          'enable',
          'disable',
          'set_standby',
          'delete'
        ])
        .describe('Action to perform'),
      actionId: z.string().optional().describe('Native SIM action ID required for get_action'),
      simCardId: z
        .string()
        .optional()
        .describe(
          'SIM card ID (required for get, update, enable, disable, set_standby, delete)'
        ),
      simCardGroupId: z
        .string()
        .optional()
        .describe('SIM card group ID (for update or list filter)'),
      tags: z.array(z.string()).optional().describe('Tags to assign (for update action)'),
      status: z.string().optional().describe('Filter by status (for list action)'),
      pageNumber: z.number().optional().describe('Page number for list action'),
      pageSize: z.number().optional().describe('Page size for list action')
    })
  )
  .output(
    z.object({
      simCards: z
        .array(
          z.object({
            simCardId: z.string().describe('SIM card ID'),
            iccid: z.string().nullish().describe('ICCID of the SIM card'),
            status: z.string().nullish().describe('SIM card status'),
            simCardGroupId: z.string().nullish().describe('Group ID'),
            tags: z.array(z.string()).optional().describe('Tags'),
            createdAt: z.string().nullish().describe('Created timestamp')
          })
        )
        .optional()
        .describe('List of SIM cards'),
      simCard: z
        .object({
          simCardId: z.string().describe('SIM card ID'),
          iccid: z.string().nullish().describe('ICCID'),
          status: z.string().nullish().describe('Status'),
          simCardGroupId: z.string().nullish().describe('Group ID'),
          tags: z.array(z.string()).optional().describe('Tags'),
          ipv4: z.string().nullish().describe('IPv4 address'),
          imsi: z.string().nullish().describe('IMSI'),
          currentBillingPeriodConsumedDataAmount: z
            .string()
            .optional()
            .describe('Native decimal consumption amount; no inferred byte conversion'),
          currentBillingPeriodConsumedDataUnit: z
            .string()
            .optional()
            .describe('Native consumption unit, normally MB'),
          currentBillingPeriodConsumedDataBytes: z
            .number()
            .optional()
            .describe(
              'Legacy bytes field; omitted because native amount/unit do not establish a byte conversion'
            ),
          createdAt: z.string().nullish().describe('Created timestamp')
        })
        .optional()
        .describe('Single SIM card details'),
      deleted: z.boolean().optional().describe('Whether the SIM card was deleted'),
      actionPerformed: z
        .string()
        .nullish()
        .describe('Requested action; SIM transitions are asynchronous'),
      action: z
        .object({
          actionId: z.string(),
          simCardId: z.string(),
          type: z.string(),
          status: z.string(),
          reason: z.string().nullish()
        })
        .optional(),
      totalResults: z.number().optional().describe('Total results (for list)')
    })
  )
  .handleInvocation(async ctx => {
    let client = new TelnyxClient({ token: ctx.auth.token });

    if (ctx.input.action === 'get_action') {
      const result = await client.getSimCardAction(ctx.input.actionId!);
      return {
        output: {
          action: {
            actionId: result.id,
            simCardId: result.sim_card_id,
            type: result.action_type,
            status: result.status.value,
            reason: result.status.reason
          }
        },
        message: `SIM action ${result.id}: ${result.status.value}.`
      };
    }
    if (ctx.input.action === 'list') {
      let result = await client.listSimCards({
        pageNumber: ctx.input.pageNumber,
        pageSize: ctx.input.pageSize,
        status: ctx.input.status,
        simCardGroupId: ctx.input.simCardGroupId
      });
      let simCards = (result.data ?? []).map(s => ({
        simCardId: s.id,
        iccid: s.iccid,
        status: s.status.value,
        simCardGroupId: s.sim_card_group_id,
        tags: s.tags,
        createdAt: s.created_at
      }));
      return {
        output: { simCards, totalResults: result.meta?.total_results },
        message: `Found **${simCards.length}** SIM card(s).`
      };
    }

    if (ctx.input.action === 'delete') {
      await client.deleteSimCard(ctx.input.simCardId!);
      return {
        output: { deleted: true, actionPerformed: 'delete' },
        message: `SIM card **${ctx.input.simCardId}** decommissioned.`
      };
    }

    if (
      ctx.input.action === 'enable' ||
      ctx.input.action === 'disable' ||
      ctx.input.action === 'set_standby'
    ) {
      let result = await client.simCardAction(ctx.input.simCardId!, ctx.input.action);
      return {
        output: {
          simCard: {
            simCardId: result.sim_card_id,
            status: undefined
          },
          actionPerformed: ctx.input.action,
          action: {
            actionId: result.id,
            simCardId: result.sim_card_id,
            type: result.action_type,
            status: result.status.value,
            reason: result.status.reason
          }
        },
        message: `SIM card **${ctx.input.simCardId}** action **${ctx.input.action}** accepted; action ID ${result.id}, native action status ${result.status.value}.`
      };
    }

    if (ctx.input.action === 'update') {
      let result = await client.updateSimCard(ctx.input.simCardId!, {
        simCardGroupId: ctx.input.simCardGroupId,
        tags: ctx.input.tags
      });
      return {
        output: {
          simCard: {
            simCardId: result.id,
            iccid: result.iccid,
            status: result.status.value,
            simCardGroupId: result.sim_card_group_id,
            tags: result.tags,
            createdAt: result.created_at
          }
        },
        message: `SIM card **${result.id}** updated.`
      };
    }

    // get
    let result = await client.getSimCard(ctx.input.simCardId!);
    return {
      output: {
        simCard: {
          simCardId: result.id,
          iccid: result.iccid,
          status: result.status.value,
          simCardGroupId: result.sim_card_group_id,
          tags: result.tags,
          ipv4: result.ipv4,
          imsi: result.imsi,
          currentBillingPeriodConsumedDataAmount:
            result.current_billing_period_consumed_data?.amount,
          currentBillingPeriodConsumedDataUnit:
            result.current_billing_period_consumed_data?.unit,
          createdAt: result.created_at
        }
      },
      message: `SIM card **${result.iccid ?? result.id}** — Status: ${result.status.value}.`
    };
  })
  .build();
