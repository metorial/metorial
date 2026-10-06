import { z } from 'zod';
import { response } from './validation';

const text = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
const boolean = z
  .boolean()
  .nullish()
  .transform(value => value ?? undefined);
const object = z
  .record(z.string(), z.json())
  .nullish()
  .transform(value => value ?? undefined);
const id = z.string().trim().min(1);
export const employee = z.object({
  id,
  name: text,
  firstName: text,
  lastName: text,
  workEmail: text,
  personalEmail: text,
  employmentType: text,
  title: text,
  department: text,
  roleState: text,
  startDate: text,
  endDate: text,
  phone: text,
  phoneNumber: text,
  workLocation: object,
  isManager: boolean,
  uniqueId: text,
  compensation: object,
  customFields: object
});
export function mapEmployee(emp: z.infer<typeof employee>) {
  return {
    employeeId: emp.id,
    name: emp.name,
    firstName: emp.firstName,
    lastName: emp.lastName,
    workEmail: emp.workEmail,
    personalEmail: emp.personalEmail,
    employmentType: emp.employmentType,
    title: emp.title,
    department: emp.department,
    roleState: emp.roleState,
    startDate: emp.startDate,
    endDate: emp.endDate,
    phone: emp.phone ?? emp.phoneNumber,
    workLocation: emp.workLocation,
    isManager: emp.isManager,
    uniqueId: emp.uniqueId,
    compensation: emp.compensation,
    customFields: emp.customFields
  };
}
export const company = z.object({
  id,
  name: text,
  primaryEmail: text,
  phone: text,
  phoneNumber: text,
  address: object,
  workLocations: z
    .array(z.record(z.string(), z.json()))
    .nullish()
    .transform(value => value ?? undefined),
  ein: text
});
export const group = z.object({
  id,
  name: text,
  spokeId: text,
  users: z.array(id),
  version: z.string().refine(value => !!value.trim())
});
export function mapGroup(value: z.infer<typeof group>) {
  const n = Number(value.version);
  const numeric =
    /^(0|[1-9]\d*)$/.test(value.version) &&
    Number.isSafeInteger(n) &&
    String(n) === value.version
      ? n
      : undefined;
  return {
    groupId: value.id,
    name: value.name,
    spokeId: value.spokeId,
    userIds: value.users,
    version: numeric,
    versionToken: value.version
  };
}
export const leaveRequest = z.object({
  id,
  role: text,
  requestedBy: text,
  status: text,
  startDate: text,
  endDate: text,
  companyLeaveType: text,
  leavePolicy: text,
  reasonForLeave: text,
  managedBy: text,
  isPaid: boolean
});
export function mapLeave(value: z.infer<typeof leaveRequest>) {
  return {
    leaveRequestId: value.id,
    role: value.role,
    requestedBy: value.requestedBy,
    status: value.status,
    startDate: value.startDate,
    endDate: value.endDate,
    companyLeaveType: value.companyLeaveType,
    leavePolicy: value.leavePolicy,
    reasonForLeave: value.reasonForLeave,
    managedBy: value.managedBy,
    isPaid: value.isPaid
  };
}
export const orgUnit = z.object({ id, name: text, parent: text });
export const workLocation = z.object({ id, nickname: text, address: object });
export const customField = z
  .object({ Id: text, id: text, type: text, title: text, required: boolean })
  .refine(value => !!(value.Id ?? value.id));
export const leaveType = z.object({
  id,
  leaveType: text,
  key: text,
  name: text,
  description: text,
  isUnpaid: boolean
});
export const currentUser = z.object({ id, workEmail: text, company: text });
const minutes = z
  .union([z.number().finite(), z.string().regex(/^-?\d+(?:\.\d+)?$/)])
  .transform(value => Number(value))
  .refine(value => Number.isFinite(value) && Math.abs(value) <= Number.MAX_SAFE_INTEGER)
  .nullish()
  .transform(value => value ?? undefined);
export const leaveBalances = z.object({
  role: id,
  balances: z.array(
    z.object({
      companyLeaveType: id,
      isBalanceUnlimited: boolean,
      balanceWithFutureRequests: minutes,
      balanceWithoutFutureRequests: minutes
    })
  )
});
export const candidate = z.object({
  candidateId: id.optional(),
  name: id,
  email: id,
  jobTitle: text,
  phoneNumber: text,
  department: text,
  startDate: text
});
export function collection<T>(schema: z.ZodType<T>, value: unknown): T[] {
  return response(z.array(schema), value);
}
