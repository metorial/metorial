import { createApiServiceError } from 'slates';
import type { EntryWrite } from './client';

let validateDate = (value: string, label: string) => {
  let date = value.slice(0, 10);
  let parsed = new Date(`${date}T00:00:00Z`);
  if (
    !/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(value) ||
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== date ||
    Number.isNaN(Date.parse(value))
  ) {
    throw createApiServiceError(
      `${label} must be a valid date in YYYY-MM-DD or ISO date-time format.`
    );
  }
};

export let validateDateRange = (dateFrom?: string, dateTo?: string) => {
  if (dateFrom !== undefined) validateDate(dateFrom, 'dateFrom');
  if (dateTo !== undefined) validateDate(dateTo, 'dateTo');
  if (
    dateFrom !== undefined &&
    dateTo !== undefined &&
    Date.parse(dateFrom) > Date.parse(dateTo)
  ) {
    throw createApiServiceError('dateFrom must be on or before dateTo.');
  }
};

export let validateEntry = (entry: EntryWrite, label = 'Entry') => {
  let hasUserId = entry.user_id !== undefined;
  let hasEmail = entry.email !== undefined;
  if (hasUserId === hasEmail) {
    throw createApiServiceError(`${label}: provide exactly one of userId or userEmail.`);
  }
  if (entry.email !== undefined && !entry.email.trim()) {
    throw createApiServiceError(`${label}: userEmail must not be empty.`);
  }
  if (entry.user_id !== undefined && (!Number.isInteger(entry.user_id) || entry.user_id < 1)) {
    throw createApiServiceError(
      `${label}: userId must be a positive whole number from List Users.`
    );
  }
  if (!Number.isInteger(entry.kpi_id) || entry.kpi_id < 1) {
    throw createApiServiceError(
      `${label}: kpiId must be a positive whole number from List KPIs.`
    );
  }
  validateDate(entry.entry_date, `${label} entryDate`);
  if (entry.notes !== undefined && entry.notes !== null && entry.notes.length > 500) {
    throw createApiServiceError(`${label}: notes must contain at most 500 characters.`);
  }
};
