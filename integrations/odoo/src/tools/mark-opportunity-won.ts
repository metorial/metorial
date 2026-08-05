import { buildApiServiceError, createApiServiceError, SlateTool } from 'slates';
import { z } from 'zod';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const OPPORTUNITY_MODEL = 'crm.lead';
const STAGE_MODEL = 'crm.stage';
const PREFLIGHT_FIELDS = ['id', 'type'];
const READBACK_FIELDS = [
  'id',
  'name',
  'type',
  'active',
  'stage_id',
  'probability',
  'partner_id',
  'user_id',
  'team_id',
  'expected_revenue',
  'date_closed'
];
const STAGE_FIELDS = ['id', 'name', 'is_won'];
const MAX_CONTEXT_DEPTH = 20;

type JsonRecord = Record<string, unknown>;

interface OptionalRelationship {
  id: number | null;
  name: string | null;
}

interface WonOpportunity {
  opportunityId: number;
  name: string;
  type: 'opportunity';
  active: boolean;
  won: true;
  probability: number;
  probabilityIs100: boolean;
  stageId: number;
  stageName: string;
  stageIsWon: boolean;
  partnerId: number | null;
  partnerName: string | null;
  userId: number | null;
  userName: string | null;
  teamId: number | null;
  teamName: string | null;
  expectedRevenue: number;
  dateClosed: string | null;
}

let invalidInput = (message: string, reason: string) =>
  createApiServiceError(message, { reason });

let isPlainRecord = (value: unknown): value is JsonRecord => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  let prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};

let isJsonCompatible = (value: unknown, depth = 0, ancestors = new Set<object>()): boolean => {
  if (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  ) {
    return true;
  }
  if (depth >= MAX_CONTEXT_DEPTH || typeof value !== 'object' || ancestors.has(value)) {
    return false;
  }

  ancestors.add(value);
  let compatible = Array.isArray(value)
    ? value.every(item => isJsonCompatible(item, depth + 1, ancestors))
    : isPlainRecord(value) &&
      Object.values(value).every(item => isJsonCompatible(item, depth + 1, ancestors));
  ancestors.delete(value);
  return compatible;
};

let normalizeOpportunityId = (value: unknown) => {
  if (typeof value !== 'number' || !Number.isInteger(value) || value <= 0) {
    throw invalidInput(
      'Opportunity ID must be a positive integer.',
      'odoo_mark_opportunity_won_id_invalid'
    );
  }
  return value;
};

let normalizeContext = (value: unknown): JsonRecord | undefined => {
  if (value === undefined) return undefined;
  if (!isPlainRecord(value) || !isJsonCompatible(value)) {
    throw invalidInput(
      `Odoo context must be a plain JSON object with at most ${MAX_CONTEXT_DEPTH} levels of nesting.`,
      'odoo_mark_opportunity_won_context_invalid'
    );
  }
  return { ...value };
};

let requireOneRecord = (value: unknown, expectedId: number, subject: string): JsonRecord => {
  if (!Array.isArray(value) || value.length !== 1 || !isPlainRecord(value[0])) {
    throw createApiServiceError(`Odoo did not return exactly one ${subject}.`, {
      reason: 'odoo_mark_opportunity_won_readback_invalid'
    });
  }
  if (value[0].id !== expectedId) {
    throw createApiServiceError(`Odoo returned a different ${subject}.`, {
      reason: 'odoo_mark_opportunity_won_readback_invalid'
    });
  }
  return value[0];
};

let requireOpportunityType = (value: unknown, opportunityId: number) => {
  if (value === 'opportunity') return;
  if (value === 'lead') {
    throw createApiServiceError(
      `Odoo crm.lead #${opportunityId} is a lead, not an opportunity. Convert it to an opportunity before marking it won.`,
      { reason: 'odoo_mark_opportunity_won_type_invalid' }
    );
  }
  throw createApiServiceError('Odoo returned an invalid CRM record type.', {
    reason: 'odoo_mark_opportunity_won_readback_invalid'
  });
};

let requireText = (value: unknown, field: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the won opportunity.`,
      { reason: 'odoo_mark_opportunity_won_readback_invalid' }
    );
  }
  return value;
};

let optionalText = (value: unknown, field: string) => {
  if (value === false || value === null || value === undefined) return null;
  if (typeof value !== 'string' || value.trim() === '') {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the won opportunity.`,
      { reason: 'odoo_mark_opportunity_won_readback_invalid' }
    );
  }
  return value;
};

let requireBoolean = (value: unknown, field: string) => {
  if (typeof value !== 'boolean') {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the won opportunity.`,
      { reason: 'odoo_mark_opportunity_won_readback_invalid' }
    );
  }
  return value;
};

let requireFiniteNumber = (value: unknown, field: string) => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the won opportunity.`,
      { reason: 'odoo_mark_opportunity_won_readback_invalid' }
    );
  }
  return value;
};

let normalizeRelationship = (
  value: unknown,
  field: string,
  required = false
): OptionalRelationship => {
  if (!required && (value === false || value === null || value === undefined)) {
    return { id: null, name: null };
  }

  let id = typeof value === 'number' ? value : Array.isArray(value) ? value[0] : undefined;
  let name =
    Array.isArray(value) && typeof value[1] === 'string' && value[1].trim() !== ''
      ? value[1]
      : null;
  if (typeof id !== 'number' || !Number.isInteger(id) || id <= 0) {
    throw createApiServiceError(
      `Odoo returned an invalid ${field} while verifying the won opportunity.`,
      { reason: 'odoo_mark_opportunity_won_readback_invalid' }
    );
  }
  return { id, name };
};

let readArguments = (fields: string[], context: JsonRecord | undefined) => ({
  fields,
  load: null,
  ...(context === undefined ? {} : { context })
});

let requireWonOpportunity = (
  value: unknown,
  stageValue: unknown,
  opportunityId: number
): WonOpportunity => {
  let record = requireOneRecord(
    value,
    opportunityId,
    'opportunity while verifying the result'
  );
  requireOpportunityType(record.type, opportunityId);
  let stage = normalizeRelationship(record.stage_id, 'opportunity stage', true);
  let stageRecord = requireOneRecord(
    stageValue,
    stage.id as number,
    'CRM stage while verifying the result'
  );
  let stageIsWon = requireBoolean(stageRecord.is_won, 'CRM won-stage indicator');
  let probability = requireFiniteNumber(record.probability, 'opportunity probability');
  let probabilityIs100 = probability === 100;

  if (!probabilityIs100 || !stageIsWon) {
    throw createApiServiceError(
      `Odoo did not return both required won-state indicators for opportunity #${opportunityId}: its probability is ${probability}% and its current stage won indicator is ${stageIsWon}. Review the CRM pipeline and the connected user's access before retrying.`,
      { reason: 'odoo_mark_opportunity_won_transition_not_applied' }
    );
  }

  let partner = normalizeRelationship(record.partner_id, 'customer relationship');
  let user = normalizeRelationship(record.user_id, 'salesperson relationship');
  let team = normalizeRelationship(record.team_id, 'sales team relationship');
  return {
    opportunityId,
    name: requireText(record.name, 'opportunity name'),
    type: 'opportunity',
    active: requireBoolean(record.active, 'opportunity active status'),
    won: true,
    probability,
    probabilityIs100,
    stageId: stage.id as number,
    stageName: requireText(stageRecord.name, 'CRM stage name'),
    stageIsWon,
    partnerId: partner.id,
    partnerName: partner.name,
    userId: user.id,
    userName: user.name,
    teamId: team.id,
    teamName: team.name,
    expectedRevenue: requireFiniteNumber(record.expected_revenue, 'expected revenue'),
    dateClosed: optionalText(record.date_closed, 'closed date')
  };
};

export let markOpportunityWon = SlateTool.create(spec, {
  name: 'Mark Opportunity Won',
  key: 'mark_opportunity_won',
  description:
    'Mark one Odoo CRM opportunity as won and return its verified probability, won-stage status, ownership, customer, expected revenue, and closed date.',
  instructions: [
    'Use the exact positive crm.lead record ID of an opportunity. Convert a lead to an opportunity before using this tool.',
    'Odoo reactivates the opportunity, selects an applicable won stage for its sales team, and sets its probability to 100 percent.',
    'The tool reads the opportunity and stage back and succeeds only when Odoo reports both documented won-state indicators: probability 100 percent and a stage configured as won.'
  ],
  constraints: [
    'Requires the Odoo CRM module and permission to read and update the target opportunity and read its CRM stage.',
    'Marking an opportunity won can trigger revenue reporting, notifications, automation, or other workflows configured in Odoo.'
  ],
  tags: {
    destructive: true,
    readOnly: false
  }
})
  .input(
    z.object({
      opportunityId: z
        .number()
        .int()
        .positive()
        .describe('Positive Odoo crm.lead record ID of the opportunity to mark won'),
      context: z
        .record(z.string(), z.unknown())
        .optional()
        .describe(
          'Optional Odoo context, such as {"lang":"en_US"} or {"allowed_company_ids":[1,2]}'
        )
    })
  )
  .output(
    z.object({
      opportunityId: z.number().int().positive().describe('Won Odoo opportunity ID'),
      name: z.string().min(1).describe('Opportunity name'),
      type: z.literal('opportunity').describe('Verified Odoo CRM record type'),
      active: z.boolean().describe('Current active status after the transition'),
      won: z
        .literal(true)
        .describe('Whether both documented Odoo won-state indicators were verified'),
      probability: z.number().finite().describe('Current closing probability percentage'),
      probabilityIs100: z
        .boolean()
        .describe('Whether Odoo returned the documented 100 percent won probability'),
      stageId: z.number().int().positive().describe('Current CRM stage ID'),
      stageName: z.string().min(1).describe('Current CRM stage name'),
      stageIsWon: z
        .boolean()
        .describe('Whether the current CRM stage is configured as a won stage'),
      partnerId: z.number().int().positive().nullable().describe('Customer ID, when set'),
      partnerName: z.string().nullable().describe('Customer name, when returned by Odoo'),
      userId: z.number().int().positive().nullable().describe('Salesperson user ID, when set'),
      userName: z.string().nullable().describe('Salesperson name, when returned by Odoo'),
      teamId: z.number().int().positive().nullable().describe('Sales team ID, when set'),
      teamName: z.string().nullable().describe('Sales team name, when returned by Odoo'),
      expectedRevenue: z.number().finite().describe('Current expected revenue'),
      dateClosed: z.string().min(1).nullable().describe('Closed date and time, when available')
    })
  )
  .handleInvocation(async ctx => {
    let opportunityId = normalizeOpportunityId(ctx.input.opportunityId);
    let context = normalizeContext(ctx.input.context);

    let wonOpportunity: WonOpportunity;
    try {
      let client = createClient(ctx);
      let preflightArguments = readArguments(PREFLIGHT_FIELDS, context);
      let preflight = await client.callRecordMethod({
        model: OPPORTUNITY_MODEL,
        method: 'read',
        ids: [opportunityId],
        arguments: preflightArguments,
        legacyKeywordArguments: preflightArguments
      });
      let preflightRecord = requireOneRecord(
        preflight,
        opportunityId,
        'CRM record while checking its type'
      );
      requireOpportunityType(preflightRecord.type, opportunityId);

      await client.callRecordMethod({
        model: OPPORTUNITY_MODEL,
        method: 'action_set_won',
        ids: [opportunityId],
        arguments: context === undefined ? undefined : { context },
        legacyKeywordArguments: context === undefined ? undefined : { context }
      });

      let opportunityReadArguments = readArguments(READBACK_FIELDS, context);
      let readback = await client.callRecordMethod({
        model: OPPORTUNITY_MODEL,
        method: 'read',
        ids: [opportunityId],
        arguments: opportunityReadArguments,
        legacyKeywordArguments: opportunityReadArguments
      });
      let opportunityRecord = requireOneRecord(
        readback,
        opportunityId,
        'opportunity while locating its CRM stage'
      );
      let stage = normalizeRelationship(opportunityRecord.stage_id, 'opportunity stage', true);
      let stageReadArguments = readArguments(STAGE_FIELDS, context);
      let stageReadback = await client.callRecordMethod({
        model: STAGE_MODEL,
        method: 'read',
        ids: [stage.id as number],
        arguments: stageReadArguments,
        legacyKeywordArguments: stageReadArguments
      });
      wonOpportunity = requireWonOpportunity(readback, stageReadback, opportunityId);
    } catch (error) {
      throw buildApiServiceError(error, {
        providerLabel: 'Odoo',
        operation: `marking opportunity #${opportunityId} as won`,
        reason: 'odoo_mark_opportunity_won_failed'
      });
    }

    return {
      output: wonOpportunity,
      message: `Marked Odoo opportunity **${wonOpportunity.name}** (#${opportunityId}) as won in stage **${wonOpportunity.stageName}**.`
    };
  })
  .build();
