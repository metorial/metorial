import { createApiServiceError, pickDefined } from 'slates';
import type { StreamtimeClient } from './client';

export interface TimeEntryInput {
  jobItemId?: number;
  jobItemUserId?: number;
  jobId?: number;
  userId?: number;
  minutes?: number;
  hours?: number;
  date?: string;
  notes?: string;
}

export let buildTimeEntryBody = async (client: StreamtimeClient, input: TimeEntryInput) => {
  if (input.minutes !== undefined && input.hours !== undefined) {
    throw createApiServiceError('Provide minutes or hours for a time entry, not both.');
  }
  let minutes = input.minutes ?? (input.hours === undefined ? undefined : input.hours * 60);
  if (minutes !== undefined) {
    let roundedMinutes = Math.round(minutes);
    // Decimal hours can produce tiny floating-point differences from whole minutes.
    let minutePrecisionTolerance = 1e-9;
    if (
      !Number.isFinite(minutes) ||
      minutes < 0 ||
      Math.abs(minutes - roundedMinutes) > minutePrecisionTolerance
    ) {
      throw createApiServiceError('Time must be a non-negative whole number of minutes.');
    }
    minutes = roundedMinutes;
  }
  if (input.jobItemId !== undefined && input.jobItemUserId !== undefined) {
    throw createApiServiceError(
      'Provide jobItemId or jobItemUserId for a time entry, not both.'
    );
  }

  let body: Record<string, unknown> = pickDefined({
    userId: input.userId,
    minutes,
    date: input.date,
    notes: input.notes
  });
  if (input.jobId !== undefined) body.job = { id: input.jobId };
  if (input.jobItemUserId !== undefined) body.jobItemUser = { id: input.jobItemUserId };

  // v1 associates time with a person's assignment, rather than a bare job item.
  if (input.jobItemId !== undefined) {
    let assignments = await client.listJobItemUsers(input.jobItemId);
    let matches = assignments.filter(assignment =>
      input.userId === undefined ? true : assignment.userId === input.userId
    );
    if (matches.length !== 1) {
      throw createApiServiceError(
        'The job item must have exactly one matching user assignment. Call get_job_item to inspect assignments, specify userId, or assign the user with manage_job_plan.'
      );
    }
    let assignment = matches[0]!;
    if (typeof assignment.id !== 'number' || typeof assignment.userId !== 'number') {
      throw createApiServiceError(
        'Streamtime returned a job item assignment without its ID or user ID.'
      );
    }
    body.jobItemUser = { id: assignment.id };
    body.userId = assignment.userId;
  }
  return body;
};
