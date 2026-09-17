import { createApiServiceError, getServiceErrorData, SlateTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { spec } from '../spec';

type PlannedAvailabilityUpdate = {
  roomTypeId: number;
  startDate: string;
  endDate: string;
  availableUnits: number;
};

// `availableUnits` is left undefined when the period relies on isAvailable true,
// meaning "the room type's full unit count", which only the property can answer.
type RequestedAvailabilityUpdate = {
  roomTypeId: number;
  startDate: string;
  endDate: string;
  label: string;
  availableUnits?: number;
};

let providerDetail = (error: unknown) =>
  getServiceErrorData(error)?.message ??
  (error instanceof Error ? error.message : String(error));

// GET /v2/properties/{id}/rooms returns a bare array of room types, each with
// `units`: "Number of units (same room type) that this room has". Room types
// without a usable count are left out so the caller is told to be explicit
// instead of being given a guessed count.
let readRoomUnitCounts = (rooms: unknown) => {
  let counts = new Map<number, number>();

  if (!Array.isArray(rooms)) return counts;

  for (let room of rooms) {
    if (room === null || typeof room !== 'object') continue;

    let { id, units } = room as { id?: unknown; units?: unknown };

    if (typeof id !== 'number' || typeof units !== 'number') continue;
    if (!Number.isInteger(units) || units < 1) continue;

    counts.set(id, units);
  }

  return counts;
};

export let updateAvailability = SlateTool.create(spec, {
  name: 'Update Availability',
  key: 'update_availability',
  description: `Update the availability calendar for a property's room types. Sets how many units of a room type are available over a date range, so periods can be opened up, reduced, or taken down to zero units. Each room type and period is updated individually.`,
  instructions: [
    'Dates should be in YYYY-MM-DD format.',
    'Each period defines a date range and the number of units to make available over it.',
    "Availability is stored as a number of available units, not a flag. isAvailable false sends 0 units, and isAvailable true sends the room type's full unit count, which is read from the property first so a room type with several units is reopened at full capacity.",
    'To open only part of a room type capacity, send availableUnits with the exact number of units. When both are given, availableUnits wins and isAvailable is ignored.',
    'If a period relies on isAvailable true and the property does not report a usable unit count for that room type, the whole request is rejected before anything is changed, so resend it with availableUnits set explicitly.',
    'Minimum stay is not part of the availability calendar. Set it with update_rates on the matching date range.',
    'Every room type and period is updated in its own request, applied in the order given: room types in order, and each room type periods in order. If one request fails, the periods already applied stay applied and the error names them.',
    'The provider does not document whether endDate is counted as part of the updated period, so confirm the result with get_availability when the exact boundary matters.'
  ],
  tags: {
    destructive: false
  }
})
  .input(
    z.object({
      propertyId: z.number().describe('The property ID to update availability for'),
      roomUpdates: z
        .array(
          z.object({
            roomTypeId: z.number().describe('The room type ID to update'),
            periods: z
              .array(
                z.object({
                  startDate: z.string().describe('Start date of the period (YYYY-MM-DD)'),
                  endDate: z.string().describe('End date of the period (YYYY-MM-DD)'),
                  isAvailable: z
                    .boolean()
                    .optional()
                    .describe(
                      "Whether the room should be available during this period. True restores the room type's full unit count, read from the property so a multi-unit room type is reopened at its real capacity rather than at a single unit, and false sets it to 0. Ignored when availableUnits is also supplied. Provide this or availableUnits"
                    ),
                  minStay: z
                    .number()
                    .optional()
                    .describe(
                      'Not supported here. The availability calendar only stores available unit counts, so setting this fails with an explanation instead of quietly ignoring it. Use update_rates to set a minimum stay'
                    ),
                  availableUnits: z
                    .number()
                    .int()
                    .min(0)
                    .optional()
                    .describe(
                      'Exact number of units of this room type to make available over the period. Takes precedence over isAvailable when both are supplied. Use 0 to leave no units available. Provide this or isAvailable'
                    )
                })
              )
              .min(1)
              .describe('Date periods to update')
          })
        )
        .min(1)
        .describe('Room type availability updates')
    })
  )
  .output(
    z.object({
      success: z
        .boolean()
        .describe(
          'True only when every room type and period in the request was applied. A failure part-way through raises an error naming the periods that had already been applied'
        ),
      propertyId: z.number().describe('The property ID that was updated'),
      periodsUpdated: z.number().describe('Number of room type periods that were applied'),
      updatedPeriods: z
        .array(
          z.object({
            roomTypeId: z.number().describe('The room type ID that was updated'),
            startDate: z.string().describe('Start date of the applied period'),
            endDate: z.string().describe('End date of the applied period'),
            availableUnits: z
              .number()
              .describe('Available unit count that was set for the period')
          })
        )
        .describe('Every period that was applied, in the order the updates were sent')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    let requested: RequestedAvailabilityUpdate[] = [];

    for (let [roomIndex, room] of ctx.input.roomUpdates.entries()) {
      for (let [periodIndex, period] of room.periods.entries()) {
        let label = `roomUpdates[${roomIndex}].periods[${periodIndex}]`;

        if (period.minStay !== undefined) {
          throw createApiServiceError(
            `${label} sets minStay, which the availability calendar cannot store — a period carries only its start date, end date and available unit count. Minimum stay belongs to pricing, so set it with update_rates on the matching date range and retry this update without minStay.`
          );
        }

        if (period.availableUnits === undefined && period.isAvailable === undefined) {
          throw createApiServiceError(
            `${label} sets neither availableUnits nor isAvailable. Provide one of them so the available unit count for the period is unambiguous.`
          );
        }

        requested.push({
          roomTypeId: room.roomTypeId,
          startDate: period.startDate,
          endDate: period.endDate,
          label,
          availableUnits: period.availableUnits ?? (period.isAvailable ? undefined : 0)
        });
      }
    }

    // `available` is a unit count, so isAvailable true has to send the room
    // type's real capacity — sending 1 would silently close every other unit.
    // Only spend the extra round trip when a period actually needs it, and read
    // the property once for the whole invocation.
    let unitCounts = new Map<number, number>();

    if (requested.some(update => update.availableUnits === undefined)) {
      let rooms: unknown;

      try {
        rooms = await client.getPropertyRooms(ctx.input.propertyId);
      } catch (error) {
        throw createApiServiceError(
          `Could not read the room types of property #${ctx.input.propertyId} to work out how many units isAvailable true should restore, so no periods were changed. Retry once the property is readable, or resend with availableUnits set explicitly on every period. ${providerDetail(error)}`
        );
      }

      unitCounts = readRoomUnitCounts(rooms);
    }

    // Every unit count is resolved before the first write, so a room type that
    // cannot be resolved fails with nothing applied and nothing to unwind.
    let planned: PlannedAvailabilityUpdate[] = [];

    for (let update of requested) {
      let availableUnits = update.availableUnits;

      if (availableUnits === undefined) {
        let units = unitCounts.get(update.roomTypeId);

        if (units === undefined) {
          throw createApiServiceError(
            `${update.label} sets isAvailable true for room type #${update.roomTypeId}, but property #${ctx.input.propertyId} does not report a usable unit count for that room type, so the number of units to make available is unknown. No periods were changed. Resend with availableUnits set to the exact number of units for this period, or confirm the room type ID with get_property.`
          );
        }

        availableUnits = units;
      }

      planned.push({
        roomTypeId: update.roomTypeId,
        startDate: update.startDate,
        endDate: update.endDate,
        availableUnits
      });
    }

    let updatedPeriods: PlannedAvailabilityUpdate[] = [];

    for (let update of planned) {
      try {
        await client.setRoomAvailability(ctx.input.propertyId, update.roomTypeId, {
          period_start: update.startDate,
          period_end: update.endDate,
          available: update.availableUnits
        });
      } catch (error) {
        let reason = error instanceof Error ? error.message : String(error);
        let failed = `room type #${update.roomTypeId} from ${update.startDate} to ${update.endDate}`;

        if (updatedPeriods.length === 0) {
          throw createApiServiceError(
            `Could not update availability for ${failed} on property #${ctx.input.propertyId}, and no periods were changed. ${reason}`
          );
        }

        let applied = updatedPeriods
          .map(
            period =>
              `room type #${period.roomTypeId} from ${period.startDate} to ${period.endDate} set to ${period.availableUnits} unit(s)`
          )
          .join('; ');

        throw createApiServiceError(
          `Could not update availability for ${failed} on property #${ctx.input.propertyId}. The calendar is now partially updated — these periods were already applied and remain applied: ${applied}. That period and every later one in the request were not changed. ${reason}`
        );
      }

      updatedPeriods.push(update);
    }

    return {
      output: {
        success: true,
        propertyId: ctx.input.propertyId,
        periodsUpdated: updatedPeriods.length,
        updatedPeriods
      },
      message: `Updated **${updatedPeriods.length}** availability period(s) across **${ctx.input.roomUpdates.length}** room type(s) for property **#${ctx.input.propertyId}**.`
    };
  })
  .build();
