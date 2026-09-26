import { createApiServiceError } from 'slates';
import { z } from 'zod';
import type { OracleCollectionPath, OracleFusionClient } from '../../lib/client';
import { oracleDateSchema } from '../../lib/dates';
import { idField, type OracleRecord, stringField } from '../../lib/records';
import { resourceKeySchema } from '../../lib/schemas';

export let effectiveDateInputSchema = z
  .string()
  .optional()
  .describe(
    'Date to view the resource as of, in YYYY-MM-DD format. Use the same date throughout worker, work relationship, assignment, and manager discovery. Omit to use Oracle Fusion’s current date.'
  );

export let effectiveDateOutputFields = {
  effectiveDate: z
    .string()
    .optional()
    .describe(
      'Explicit effective date sent to Oracle Fusion. Omitted when using its current date.'
    ),
  effectiveDateMode: z
    .enum(['specified', 'current'])
    .describe(
      'Whether the request uses the specified effective date or Oracle Fusion’s current date.'
    )
};

export let dateContext = (
  effectiveDate: string | undefined
): { effectiveDate?: string; effectiveDateMode: 'specified' | 'current' } => {
  if (effectiveDate !== undefined) {
    let parsed = new Date(`${effectiveDate}T00:00:00Z`);
    if (
      !/^\d{4}-\d{2}-\d{2}$/.test(effectiveDate) ||
      effectiveDate.startsWith('0000-') ||
      !Number.isFinite(parsed.getTime()) ||
      parsed.toISOString().slice(0, 10) !== effectiveDate
    ) {
      throw createApiServiceError(
        'effectiveDate must be a real calendar date in YYYY-MM-DD format.',
        { reason: 'oracle_fusion_invalid_effective_date' }
      );
    }
  }
  return {
    effectiveDate,
    effectiveDateMode: effectiveDate === undefined ? 'current' : 'specified'
  };
};

export let workerKeySchema = resourceKeySchema.describe(
  'Worker resourceKey returned by list_workers or get_worker at the same effectiveDate. This is not the personId or personNumber.'
);
export let workRelationshipKeySchema = resourceKeySchema.describe(
  'Work relationship resourceKey returned by list_worker_work_relationships for this workerKey at the same effectiveDate. This is separate from periodOfServiceId.'
);
export let assignmentKeySchema = resourceKeySchema.describe(
  'Assignment resourceKey returned by list_worker_assignments or get_worker_assignment for these worker and work relationship keys at the same effectiveDate. This is not assignmentId or assignmentNumber.'
);
export let assignmentParentInputFields = {
  workerKey: workerKeySchema,
  workRelationshipKey: workRelationshipKeySchema
};
export let effectiveRangeOutputFields = {
  effectiveStartDate: z
    .string()
    .optional()
    .describe('Start date of this effective-dated record.'),
  effectiveEndDate: z.string().optional().describe('End date of this effective-dated record.')
};
export let selfLinkOutputSchema = z
  .string()
  .url()
  .optional()
  .describe('Resource self URL verified to belong to the connected Oracle Fusion instance.');
export let identifierFilterSchema = z
  .string()
  .regex(/^[0-9]+$/)
  .max(38)
  .optional()
  .describe('Exact Oracle identifier represented as decimal digits.');

export let requiredId = (record: OracleRecord, field: string): string => {
  let value = idField(record, field);
  if (!value) {
    throw createApiServiceError(
      `Oracle Fusion returned a resource without a ${field} identifier.`,
      {
        reason: 'oracle_fusion_invalid_response'
      }
    );
  }
  return value;
};

export let assertAssignmentEffectiveDate = (
  record: OracleRecord,
  effectiveDate: string | undefined
): void => {
  if (effectiveDate === undefined) return;
  let start = stringField(record, 'EffectiveStartDate');
  let end = stringField(record, 'EffectiveEndDate');
  if (
    !oracleDateSchema.safeParse(start).success ||
    !oracleDateSchema.safeParse(end).success ||
    start === undefined ||
    end === undefined ||
    start > end
  ) {
    throw createApiServiceError(
      'Oracle Fusion returned an assignment without a valid effective date range.',
      { reason: 'oracle_fusion_invalid_response' }
    );
  }
  if (effectiveDate < start || effectiveDate > end) {
    throw createApiServiceError(
      'The assignment key does not identify a record effective on the requested date. Rediscover the worker, work relationship, and assignment with the same effectiveDate.',
      { reason: 'oracle_fusion_effective_date_key_mismatch' }
    );
  }
};

export let workRelationshipsPath = (client: OracleFusionClient, workerKey: string) =>
  client.childCollectionPath('/workers', workerKey, 'workRelationships');

export let assignmentsPath = (
  client: OracleFusionClient,
  workerKey: string,
  workRelationshipKey: string
): OracleCollectionPath =>
  client.childCollectionPath(
    workRelationshipsPath(client, workerKey),
    workRelationshipKey,
    'assignments'
  );
