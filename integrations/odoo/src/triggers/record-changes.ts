import {
  buildApiServiceError,
  createApiServiceError,
  SlateDefaultPollingIntervalSeconds,
  SlateTrigger
} from 'slates';
import { z } from 'zod';
import type { OdooDomainFilter } from '../lib/client';
import { createClient } from '../lib/helpers';
import { spec } from '../spec';

const DEFAULT_MODEL = 'res.partner';
const PAGE_SIZE = 200;
const MAX_PAGES_PER_POLL = 10;
const MAX_BASELINE_PAGES = 50;
const MAX_REPLAY_PASSES = 3;

type RecordChangesState = {
  initialized?: boolean;
  boundaryRecordIds?: number[];
  lastPollDate?: string;
  lastWriteDate?: string;
  lastRecordId?: number;
  model?: string;
  pollWatermark?: string;
};

let checkpointDomain = (
  writeDate?: string,
  boundaryRecordIds: number[] = []
): OdooDomainFilter => {
  if (!writeDate) return [];

  if (boundaryRecordIds.length === 0) {
    return [['write_date', '>=', writeDate]];
  }

  return [
    '|',
    ['write_date', '>', writeDate],
    '&',
    ['write_date', '=', writeDate],
    ['id', 'not in', boundaryRecordIds]
  ];
};

let afterCursorDomain = (writeDate: string, recordId: number): OdooDomainFilter => [
  '|',
  ['write_date', '>', writeDate],
  '&',
  ['write_date', '=', writeDate],
  ['id', '>', recordId]
];

let pagedDomain = (
  baseDomain: OdooDomainFilter,
  pageCursor?: { writeDate: string; recordId: number }
): OdooDomainFilter => {
  if (!pageCursor) return baseDomain;

  let cursor = afterCursorDomain(pageCursor.writeDate, pageCursor.recordId);
  return baseDomain.length === 0 ? cursor : ['&', ...baseDomain, ...cursor];
};

let upperBoundedDomain = (
  baseDomain: OdooDomainFilter,
  upperWriteDate: string
): OdooDomainFilter => {
  let upperBound: OdooDomainFilter = [['write_date', '<=', upperWriteDate]];
  return baseDomain.length === 0 ? upperBound : ['&', ...baseDomain, ...upperBound];
};

let latestWriteDate = (...writeDates: Array<string | undefined>) =>
  writeDates
    .filter((writeDate): writeDate is string => writeDate !== undefined)
    .sort()
    .at(-1);

let cursorForRecord = (record: Record<string, unknown>) => {
  let recordId = record.id;
  let writeDate = record.write_date;

  if (typeof recordId !== 'number' || typeof writeDate !== 'string' || !writeDate) {
    throw createApiServiceError(
      'Odoo returned a record without a valid numeric ID or write date.',
      { reason: 'odoo_record_changes_invalid_response' }
    );
  }

  return {
    recordId,
    writeDate,
    createDate: typeof record.create_date === 'string' ? record.create_date : undefined
  };
};

export let recordChanges = SlateTrigger.create(spec, {
  name: 'Record Changes',
  key: 'record_changes',
  description:
    'Poll for new or recently modified Odoo contacts. Detects res.partner creation and updates from write_date while maintaining a bounded checkpoint between polls.'
})
  .input(
    z.object({
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether this record was newly created or updated'),
      recordId: z.number().describe('The Odoo record ID'),
      model: z.string().describe('The model the record belongs to'),
      record: z.record(z.string(), z.unknown()).describe('The full record data'),
      writeDate: z.string().describe('The write_date timestamp of the record'),
      createDate: z.string().optional().describe('The create_date timestamp of the record')
    })
  )
  .output(
    z.object({
      recordId: z.number().describe('The Odoo record ID'),
      model: z.string().describe('The model the record belongs to'),
      changeType: z
        .enum(['created', 'updated'])
        .describe('Whether this record was newly created or updated'),
      record: z.record(z.string(), z.unknown()).describe('The full record data'),
      writeDate: z.string().describe('The write_date timestamp'),
      createDate: z.string().optional().describe('The create_date timestamp')
    })
  )
  .polling({
    options: {
      intervalInSeconds: SlateDefaultPollingIntervalSeconds
    },

    pollEvents: async ctx => {
      let client = createClient(ctx);

      let state = (ctx.state ?? null) as RecordChangesState | null;
      // lastPollDate is retained as a migration fallback for existing trigger state.
      let previousWriteDate = state?.lastWriteDate ?? state?.lastPollDate;
      // Older state only has lastRecordId. Replaying that timestamp is safer than
      // treating all lower IDs as seen and permanently missing a late same-second write.
      let previousBoundaryRecordIds = [
        ...new Set(
          (state?.boundaryRecordIds ?? []).filter(
            recordId => Number.isInteger(recordId) && recordId > 0
          )
        )
      ];
      let initialized = state?.initialized === true || previousWriteDate !== undefined;
      let model = state?.model?.trim() || DEFAULT_MODEL;

      if (!initialized) {
        let latestRecords: Record<string, unknown>[];
        try {
          latestRecords = await client.searchRead(model, [], {
            fields: ['id', 'write_date', 'create_date'],
            order: 'write_date desc, id desc',
            limit: 1
          });
        } catch (error) {
          throw buildApiServiceError(error, {
            providerLabel: 'Odoo',
            operation: `establish the ${model} record-change baseline`,
            reason: 'odoo_record_changes_poll_error'
          });
        }

        let latestCursor = latestRecords[0] ? cursorForRecord(latestRecords[0]) : undefined;
        let baselineRecordIds: number[] = [];

        if (latestCursor) {
          let baselineCursorId = 0;
          let baselineComplete = false;

          try {
            for (let page = 0; page < MAX_BASELINE_PAGES; page++) {
              let records = await client.search(
                model,
                [
                  ['write_date', '=', latestCursor.writeDate],
                  ['id', '>', baselineCursorId]
                ],
                {
                  order: 'id asc',
                  limit: PAGE_SIZE
                }
              );

              baselineRecordIds.push(...records);
              baselineCursorId = records.at(-1) ?? baselineCursorId;

              if (records.length < PAGE_SIZE) {
                baselineComplete = true;
                break;
              }
            }

            if (!baselineComplete) {
              let overflow = await client.search(
                model,
                [
                  ['write_date', '=', latestCursor.writeDate],
                  ['id', '>', baselineCursorId]
                ],
                {
                  order: 'id asc',
                  limit: 1
                }
              );

              if (overflow.length > 0) {
                throw createApiServiceError(
                  `Odoo returned more than ${PAGE_SIZE * MAX_BASELINE_PAGES} records at the latest write-date boundary. The trigger cannot establish a safe initial checkpoint.`,
                  { reason: 'odoo_record_changes_baseline_too_large' }
                );
              }
            }
          } catch (error) {
            throw buildApiServiceError(error, {
              providerLabel: 'Odoo',
              operation: `establish the ${model} record-change boundary`,
              reason: 'odoo_record_changes_poll_error'
            });
          }
        }

        return {
          inputs: [],
          updatedState: {
            initialized: true,
            boundaryRecordIds: baselineRecordIds,
            lastPollDate: latestCursor?.writeDate,
            lastWriteDate: latestCursor?.writeDate,
            lastRecordId: baselineRecordIds.at(-1) ?? latestCursor?.recordId ?? 0,
            model,
            pollWatermark: latestCursor?.writeDate
          }
        };
      }

      let observedUpperWriteDate: string | undefined;
      try {
        let latestRecords = await client.searchRead(model, [], {
          fields: ['id', 'write_date'],
          order: 'write_date desc, id desc',
          limit: 1
        });
        observedUpperWriteDate = latestRecords[0]
          ? cursorForRecord(latestRecords[0]).writeDate
          : undefined;
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Odoo',
          operation: `capture the ${model} record-change watermark`,
          reason: 'odoo_record_changes_poll_error'
        });
      }

      // Freeze the range for every page and replay pass in this poll. Records written
      // after this capture cannot pull pagination into a moving upper boundary.
      let fixedUpperWriteDate = latestWriteDate(observedUpperWriteDate, previousWriteDate);

      if (!fixedUpperWriteDate) {
        return {
          inputs: [],
          updatedState: {
            initialized: true,
            boundaryRecordIds: previousBoundaryRecordIds,
            lastPollDate: previousWriteDate,
            lastWriteDate: previousWriteDate,
            lastRecordId: previousBoundaryRecordIds.at(-1) ?? 0,
            model,
            pollWatermark: undefined
          }
        };
      }

      let inputs: Array<{
        changeType: 'created' | 'updated';
        recordId: number;
        model: string;
        record: Record<string, unknown>;
        writeDate: string;
        createDate?: string;
      }> = [];
      let nextWriteDate = previousWriteDate;
      let nextBoundaryRecordIds = new Set(previousBoundaryRecordIds);
      let baseDomain = upperBoundedDomain(
        checkpointDomain(previousWriteDate, previousBoundaryRecordIds),
        fixedUpperWriteDate
      );
      let previousBoundaryRecordIdSet = new Set(previousBoundaryRecordIds);
      let seenChanges = new Set<string>();
      let rangeStable = false;

      for (let replayPass = 0; replayPass < MAX_REPLAY_PASSES; replayPass++) {
        let pageCursor: { writeDate: string; recordId: number } | undefined;
        let passFoundNewChange = false;

        for (let page = 0; page < MAX_PAGES_PER_POLL; page++) {
          let records: Record<string, unknown>[];
          try {
            records = await client.searchRead(model, pagedDomain(baseDomain, pageCursor), {
              fields: ['id', 'write_date', 'create_date'],
              order: 'write_date asc, id asc',
              limit: PAGE_SIZE
            });
          } catch (error) {
            throw buildApiServiceError(error, {
              providerLabel: 'Odoo',
              operation: `poll ${model} record changes`,
              reason: 'odoo_record_changes_poll_error'
            });
          }

          for (let record of records) {
            let recordCursor = cursorForRecord(record);
            let changeKey = `${recordCursor.writeDate}:${recordCursor.recordId}`;
            let wasCreatedAfterCheckpoint =
              previousWriteDate === undefined ||
              (recordCursor.createDate !== undefined &&
                (recordCursor.createDate > previousWriteDate ||
                  (recordCursor.createDate === previousWriteDate &&
                    !previousBoundaryRecordIdSet.has(recordCursor.recordId))));

            if (!seenChanges.has(changeKey)) {
              seenChanges.add(changeKey);
              passFoundNewChange = true;
              inputs.push({
                changeType: wasCreatedAfterCheckpoint ? 'created' : 'updated',
                recordId: recordCursor.recordId,
                model,
                record,
                writeDate: recordCursor.writeDate,
                createDate: recordCursor.createDate
              });
            }

            if (recordCursor.writeDate !== nextWriteDate) {
              nextWriteDate = recordCursor.writeDate;
              nextBoundaryRecordIds = new Set([recordCursor.recordId]);
            } else {
              nextBoundaryRecordIds.add(recordCursor.recordId);
            }
          }

          let lastRecord = records.at(-1);
          if (lastRecord) {
            let lastCursor = cursorForRecord(lastRecord);
            pageCursor = {
              writeDate: lastCursor.writeDate,
              recordId: lastCursor.recordId
            };
          }

          if (records.length < PAGE_SIZE) break;
        }

        if (!passFoundNewChange) {
          rangeStable = true;
          break;
        }
      }

      // If the bounded range kept changing during every replay, retain the previous
      // checkpoint. Deterministic event IDs make a retry preferable to skipping data.
      if (!rangeStable) {
        nextWriteDate = previousWriteDate;
        nextBoundaryRecordIds = new Set(previousBoundaryRecordIds);
      }

      inputs.sort(
        (left, right) =>
          left.writeDate.localeCompare(right.writeDate) || left.recordId - right.recordId
      );
      let boundaryRecordIds = [...nextBoundaryRecordIds].sort((left, right) => left - right);
      return {
        inputs,
        updatedState: {
          initialized: true,
          boundaryRecordIds,
          lastPollDate: nextWriteDate,
          lastWriteDate: nextWriteDate,
          lastRecordId: boundaryRecordIds.at(-1) ?? 0,
          model,
          pollWatermark: fixedUpperWriteDate
        }
      };
    },

    handleEvent: async ctx => {
      let client = createClient(ctx);

      let fullRecords: Record<string, unknown>[];
      try {
        fullRecords = await client.read(ctx.input.model, [ctx.input.recordId]);
      } catch (error) {
        throw buildApiServiceError(error, {
          providerLabel: 'Odoo',
          operation: `read ${ctx.input.model} record ${ctx.input.recordId}`,
          reason: 'odoo_record_changes_read_error'
        });
      }
      let fullRecord = fullRecords[0] || ctx.input.record;

      return {
        type: `record.${ctx.input.changeType}`,
        id: `${ctx.input.model}-${ctx.input.recordId}-${ctx.input.writeDate}`,
        output: {
          recordId: ctx.input.recordId,
          model: ctx.input.model,
          changeType: ctx.input.changeType,
          record: fullRecord,
          writeDate: ctx.input.writeDate,
          createDate: (fullRecord.create_date as string | undefined) ?? ctx.input.createDate
        }
      };
    }
  })
  .build();
