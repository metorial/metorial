import { z } from 'zod';

export let nativeBoolean = z
  .union([
    z.boolean(),
    z.literal(0),
    z.literal(1),
    z.literal('0'),
    z.literal('1'),
    z.literal('false'),
    z.literal('true')
  ])
  .transform(value => value === true || value === 1 || value === '1' || value === 'true');
export let nativeCount = z
  .union([z.number(), z.string().regex(/^\d+$/)])
  .transform(Number)
  .pipe(z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER));
export let userDataSchema = z.object({
  username: z.string().min(1),
  fullname: z.string().optional(),
  groups: z.array(z.string()).optional(),
  admin: nativeBoolean.optional(),
  disabled: nativeBoolean.optional(),
  neverloggedin: nativeBoolean.optional(),
  last_login: z.string().optional(),
  last_pw_change: z.string().optional(),
  created: z.string().optional(),
  mpstrength: z.string().optional(),
  multifactor: z.string().optional(),
  linked: z.string().optional(),
  totalscore: z.string().optional(),
  legacytotalscore: z.string().optional(),
  password_reset_required: nativeBoolean.optional(),
  sites: nativeCount.optional(),
  notes: nativeCount.optional(),
  formfills: nativeCount.optional(),
  applications: nativeCount.optional(),
  attachments: nativeCount.optional()
});
export let usersResponseSchema = z.object({
  Users: z.record(z.string(), userDataSchema),
  Groups: z.record(z.string(), z.array(z.string())).optional(),
  Invited: z.array(z.string()).optional(),
  total: nativeCount.optional(),
  count: nativeCount.optional()
});
export let folderSchema = z.object({
  sharedfoldername: z.string(),
  score: z.number().finite().optional(),
  users: z.array(
    z.object({
      username: z.string().min(1),
      readonly: nativeBoolean,
      give: nativeBoolean,
      can_administer: nativeBoolean,
      group_name: z.string().optional()
    })
  )
});
export let eventSchema = z.object({
  Time: z.string(),
  Username: z.string(),
  IP_Address: z.string(),
  Action: z.string(),
  Data: z.string()
});
export let reportSchema = z.object({
  status: z.literal('OK'),
  next: z.string().nullable().optional(),
  data: z.record(z.string(), eventSchema)
});
export type LastPassUser = z.infer<typeof userDataSchema>;
export type LastPassUserDataResponse = z.infer<typeof usersResponseSchema>;
export type LastPassSharedFolder = z.infer<typeof folderSchema>;
export type LastPassEvent = z.infer<typeof eventSchema>;
export interface LastPassBatchAddUser {
  username: string;
  fullname?: string;
  groups?: string[];
}
export interface LastPassGroupChange {
  username: string;
  add?: string[];
  del?: string[];
}
export interface LastPassReceipt {
  status: 'OK' | 'WARN' | 'success';
  warnings?: string[];
  disabledUsers?: string[];
  unchangedUsers?: string[];
}
