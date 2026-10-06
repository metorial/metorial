import { pickDefined } from 'slates';
import {
  boolField,
  contactId,
  malformed,
  object,
  optionalId,
  responseId,
  stringField,
  strings,
  timestamp
} from './contracts';

export const user = (value: unknown, expected?: string) => {
  const row = object(value);
  return pickDefined({
    userId: responseId(row.id, expected),
    firstName: stringField(row.first_name),
    lastName: stringField(row.last_name),
    displayName: stringField(row.display_name),
    emails: strings(row.emails),
    phoneNumbers: strings(row.phone_numbers),
    extension: stringField(row.extension),
    state: stringField(row.state),
    isAdmin: boolField(row.is_admin),
    isSuperAdmin: boolField(row.is_super_admin),
    isOnline: boolField(row.is_online),
    isAvailable: boolField(row.is_available),
    doNotDisturb: boolField(row.do_not_disturb),
    onDutyStatus: stringField(row.on_duty_status),
    officeId: optionalId(row.office_id),
    companyId: optionalId(row.company_id),
    license: stringField(row.license),
    timezone: stringField(row.timezone),
    jobTitle: stringField(row.job_title),
    imageUrl: stringField(row.image_url),
    dateAdded: stringField(row.date_added)
  });
};
export const contact = (value: unknown, expected?: string) => {
  const row = object(value);
  if (typeof row.id !== 'string' || !row.id || (expected && row.id !== expected)) malformed();
  contactId(row.id);
  return pickDefined({
    contactId: row.id,
    firstName: stringField(row.first_name),
    lastName: stringField(row.last_name),
    displayName: stringField(row.display_name),
    emails: strings(row.emails),
    phones: strings(row.phones),
    companyName: stringField(row.company_name),
    jobTitle: stringField(row.job_title),
    type: stringField(row.type),
    urls: strings(row.urls),
    ownerId: optionalId(row.owner_id)
  });
};
export const callCenter = (value: unknown, expected?: string) => {
  const row = object(value);
  return pickDefined({
    callCenterId: responseId(row.id, expected),
    name: stringField(row.name),
    description: stringField(row.group_description),
    officeId: optionalId(row.office_id),
    state: stringField(row.state),
    dateCreated: stringField(row.date_created)
  });
};
export const office = (value: unknown, expected?: string) => {
  const row = object(value);
  return pickDefined({
    officeId: responseId(row.id, expected),
    name: stringField(row.name),
    companyId: optionalId(row.company_id),
    timezone: stringField(row.timezone),
    country: stringField(row.country)
  });
};
export const number = (value: unknown, expected?: string) => {
  const row = object(value);
  if (
    typeof row.number !== 'string' ||
    !/^\+[1-9]\d{1,14}$/.test(row.number) ||
    (expected && row.number !== expected)
  )
    malformed();
  return pickDefined({
    phoneNumber: row.number,
    targetType: stringField(row.target_type),
    targetId: optionalId(row.target_id),
    status: stringField(row.status)
  });
};
export const blocked = (value: unknown, expected?: string) => {
  const row = object(value);
  if (
    typeof row.number !== 'string' ||
    !/^\+[1-9]\d{1,14}$/.test(row.number) ||
    (expected && row.number !== expected)
  )
    malformed();
  return { blockedNumberId: row.number, phoneNumber: row.number };
};
export const call = (value: unknown, expected?: string) => {
  const row = object(value);
  const direction = stringField(row.direction);
  const duration = row.duration;
  if (
    duration !== undefined &&
    duration !== null &&
    (typeof duration !== 'number' || !Number.isFinite(duration) || duration < 0)
  )
    malformed();
  return pickDefined({
    callId: responseId(row.call_id, expected),
    callState: stringField(row.state),
    dateStarted: timestamp(row.date_started),
    dateEnded: timestamp(row.date_ended),
    duration: typeof duration === 'number' ? duration / 1000 : undefined,
    direction,
    isRecording: boolField(row.was_recorded),
    callerNumber: stringField(
      direction === 'inbound'
        ? row.external_number
        : direction === 'outbound'
          ? row.internal_number
          : undefined
    ),
    calleeNumber: stringField(
      direction === 'inbound'
        ? row.internal_number
        : direction === 'outbound'
          ? row.external_number
          : undefined
    )
  });
};
export const company = (value: unknown) => {
  const row = object(value);
  return pickDefined({
    companyId: responseId(row.id),
    name: stringField(row.name),
    country: stringField(row.country),
    timezone: stringField(row.timezone),
    domain: stringField(row.domain)
  });
};
export const operators = (value: unknown) => {
  const row = object(value);
  if (!Object.hasOwn(row, 'users') && !Object.hasOwn(row, 'rooms')) malformed();
  const list = (value: unknown): unknown[] | undefined => {
    if (value === undefined) return undefined;
    if (value === null) return [];
    if (!Array.isArray(value)) return malformed();
    return value;
  };
  return pickDefined({
    users: list(row.users)?.map(v => user(v)),
    rooms: list(row.rooms)?.map(v => {
      const room = object(v);
      return pickDefined({
        roomId: responseId(room.id),
        name: stringField(room.name),
        officeId: optionalId(room.office_id),
        phoneNumbers: strings(room.phone_numbers),
        state: stringField(room.state),
        isOnDuty: boolField(room.is_on_duty)
      });
    })
  });
};
