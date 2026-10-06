import { createApiServiceError } from 'slates';

export type Row = Record<string, unknown>;
export const record = (value: unknown, label = 'response'): Row => {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw createApiServiceError(`Moosend returned an invalid ${label}.`);
  return value as Row;
};
export const records = (value: unknown, label = 'response'): Row[] => {
  if (!Array.isArray(value))
    throw createApiServiceError(`Moosend returned an invalid ${label} array.`);
  return value.map(item => record(item, label));
};
export const text = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || !value.trim())
    throw createApiServiceError(`Provide a non-empty ${label}.`);
  return value;
};
export const identifier = (value: unknown, label = 'resource ID'): string => {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value > 0)
    return String(value);
  return text(value, label);
};
export const optionalText = (value: unknown): string | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number')
    return String(value);
  throw createApiServiceError('Moosend returned an invalid text value.');
};
export const optionalNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'number' || !Number.isFinite(value))
    throw createApiServiceError('Moosend returned an invalid numeric value.');
  return value;
};
export const optionalBoolean = (value: unknown): boolean | undefined => {
  if (value === null || value === undefined) return undefined;
  if (typeof value !== 'boolean')
    throw createApiServiceError('Moosend returned an invalid boolean value.');
  return value;
};
export const email = (value: unknown, label = 'email address'): string => {
  const result = text(value, label);
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(result))
    throw createApiServiceError(`Provide a valid ${label}.`);
  return result;
};
export const paging = (page: number | undefined, pageSize: number | undefined) => {
  if (page !== undefined && (!Number.isSafeInteger(page) || page < 1))
    throw createApiServiceError('Page must be a positive integer.');
  if (
    pageSize !== undefined &&
    (!Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 1000)
  )
    throw createApiServiceError('Page size must be an integer from 1 to 1000.');
};
export const apiDate = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  const provider = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
  if (!iso && !provider)
    throw createApiServiceError('Analytics dates must use YYYY-MM-DD or DD-MM-YYYY.');
  const year = Number(iso?.[1] ?? provider?.[3]);
  const month = Number(iso?.[2] ?? provider?.[2]);
  const day = Number(iso?.[3] ?? provider?.[1]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    throw createApiServiceError('Provide a valid calendar date.');
  return `${String(day).padStart(2, '0')}-${String(month).padStart(2, '0')}-${year}`;
};
export const mapCampaign = (c: Row) => ({
  campaignId: identifier(c.ID),
  name: text(c.Name, 'campaign name'),
  subject: text(c.Subject, 'campaign subject'),
  status: optionalNumber(c.Status),
  isTransactional: optionalBoolean(c.IsTransactional),
  createdOn: optionalText(c.CreatedOn),
  deliveredOn: optionalText(c.DeliveredOn),
  scheduledFor: optionalText(c.ScheduledFor),
  scheduledForTimezone: optionalText(c.ScheduledForTimezone),
  totalSent: optionalNumber(c.TotalSent),
  uniqueOpens: optionalNumber(c.UniqueOpens),
  uniqueLinkClicks: optionalNumber(c.UniqueLinkClicks),
  recipientsCount: optionalNumber(c.RecipientsCount),
  totalBounces: optionalNumber(c.TotalBounces),
  totalComplaints: optionalNumber(c.TotalComplaints),
  totalUnsubscribes: optionalNumber(c.TotalUnsubscribes)
});
export const mapList = (l: Row) => ({
  mailingListId: identifier(l.ID),
  name: text(l.Name, 'mailing list name'),
  createdOn: optionalText(l.CreatedOn),
  updatedOn: optionalText(l.UpdatedOn),
  status: optionalNumber(l.Status),
  activeMemberCount: optionalNumber(l.ActiveMemberCount),
  bouncedMemberCount: optionalNumber(l.BouncedMemberCount),
  removedMemberCount: optionalNumber(l.RemovedMemberCount),
  unsubscribedMemberCount: optionalNumber(l.UnsubscribedMemberCount)
});
export const mapSubscriber = (s: Row) => ({
  subscriberId: identifier(s.ID),
  email: email(s.Email, 'subscriber email'),
  name: optionalText(s.Name),
  createdOn: optionalText(s.CreatedOn),
  updatedOn: optionalText(s.UpdatedOn),
  unsubscribedOn: optionalText(s.UnsubscribedOn),
  status: optionalNumber(s.SubscribeType),
  removedOn: optionalText(s.RemovedOn),
  customFields:
    s.CustomFields == null
      ? undefined
      : records(s.CustomFields, 'custom fields').map(cf => ({
          customFieldId: cf.CustomFieldID == null ? undefined : identifier(cf.CustomFieldID),
          fieldName: optionalText(cf.Name),
          fieldValue: optionalText(cf.Value)
        }))
});
export const mapSegment = (s: Row) => ({
  segmentId: identifier(s.ID),
  name: text(s.Name, 'segment name'),
  matchType: optionalNumber(s.MatchType),
  createdOn: optionalText(s.CreatedOn),
  updatedOn: optionalText(s.UpdatedOn),
  criteria:
    s.Criteria == null
      ? undefined
      : records(s.Criteria, 'criteria').map(c => ({
          criteriaId: c.ID == null ? undefined : identifier(c.ID),
          field: optionalText(c.Field),
          comparer: optionalText(c.Comparer),
          value: optionalText(c.Value)
        }))
});
