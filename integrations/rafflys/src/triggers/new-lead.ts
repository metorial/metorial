import { SlateDefaultPollingIntervalSeconds, SlateTrigger } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

export let newLeadTrigger = SlateTrigger.create(spec, {
  name: 'New Lead',
  key: 'new_lead',
  description:
    'Triggers when a new lead is captured from a Rafflys promotion (e.g., fortune wheel registration, giveaway entry form).'
})
  .input(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead'),
      createdAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the lead was captured'),
      promotionId: z.string().describe('ID of the promotion the lead belongs to'),
      leadData: z.record(z.string(), z.unknown()).describe('Full lead data from Rafflys')
    })
  )
  .output(
    z.object({
      leadId: z.string().describe('Unique identifier of the lead'),
      promotionId: z.string().describe('ID of the promotion the lead belongs to'),
      createdAt: z
        .string()
        .optional()
        .describe('ISO 8601 timestamp when the lead was captured'),
      email: z.string().optional().describe('Email address of the lead'),
      firstName: z.string().optional().describe('First name of the lead'),
      lastName: z.string().optional().describe('Last name of the lead'),
      fullName: z.string().optional().describe('Full name of the lead'),
      phone: z.string().optional().describe('Phone number of the lead'),
      additionalFields: z
        .record(z.string(), z.unknown())
        .optional()
        .describe('Any additional custom fields from the lead form')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = new Client({ token: ctx.auth.token });

      let promotions = await client.listPromotions();
      let allInputs: Array<{
        leadId: string;
        createdAt: string | undefined;
        promotionId: string;
        leadData: Record<string, unknown>;
      }> = [];

      let lastSeenId = (ctx.state as Record<string, unknown>)?.lastSeenId as
        | string
        | undefined;
      let newLastSeenId = lastSeenId;

      for (let promotion of promotions) {
        let leads = await client.getPromotionLeads(promotion.id.toString());

        for (let lead of leads) {
          if (lastSeenId && lead.id <= lastSeenId) {
            continue;
          }

          allInputs.push({
            leadId: lead.id.toString(),
            createdAt: lead.created,
            promotionId: promotion.id.toString(),
            leadData: lead as Record<string, unknown>
          });

          if (!newLastSeenId || lead.id > newLastSeenId) {
            newLastSeenId = lead.id.toString();
          }
        }
      }

      return {
        inputs: allInputs,
        updatedState: {
          lastSeenId: newLastSeenId
        }
      };
    },

    handleEvent: async ctx => {
      let { leadId, createdAt, promotionId, leadData } = ctx.input;

      let { id, created, email, firstName, lastName, fullName, phone, ...rest } =
        leadData as Record<string, unknown>;

      return {
        type: 'lead.created',
        id: leadId,
        output: {
          leadId,
          promotionId,
          createdAt,
          email: email as string | undefined,
          firstName: firstName as string | undefined,
          lastName: lastName as string | undefined,
          fullName: fullName as string | undefined,
          phone: phone as string | undefined,
          additionalFields:
            Object.keys(rest).length > 0 ? (rest as Record<string, unknown>) : undefined
        }
      };
    }
  })
  .build();
