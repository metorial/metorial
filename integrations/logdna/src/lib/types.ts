import { z } from 'zod';

const optionalString = z
  .string()
  .nullish()
  .transform(value => value ?? undefined);
const optionalStrings = z
  .array(z.string())
  .nullish()
  .transform(value => value ?? undefined);
const optionalBoolean = z
  .boolean()
  .nullish()
  .transform(value => value ?? undefined);
export const channelResponseSchema = z.looseObject({
  integration: optionalString,
  emails: z
    .union([z.string(), z.array(z.string())])
    .nullish()
    .transform(value => value ?? undefined),
  immediate: optionalBoolean,
  operator: optionalString,
  terminal: optionalBoolean,
  timezone: optionalString,
  triggerinterval: z
    .union([z.string(), z.number()])
    .nullish()
    .transform(value => value ?? undefined),
  triggerlimit: z
    .union([z.string(), z.number()])
    .nullish()
    .transform(value => value ?? undefined),
  autoresolve: optionalBoolean,
  autoresolveinterval: optionalString,
  autoresolvelimit: z
    .union([z.string(), z.number()])
    .nullish()
    .transform(value => value ?? undefined)
});
export const viewSchema = z.looseObject({
  viewID: optionalString,
  viewid: optionalString,
  id: optionalString,
  name: optionalString,
  query: optionalString,
  apps: optionalStrings,
  hosts: optionalStrings,
  levels: optionalStrings,
  tags: optionalStrings,
  channels: z
    .array(channelResponseSchema)
    .nullish()
    .transform(value => value ?? undefined),
  category: optionalStrings,
  presetids: optionalStrings,
  presetIds: optionalStrings
});
export const alertSchema = z.looseObject({
  presetid: optionalString,
  presetID: optionalString,
  id: optionalString,
  name: optionalString,
  channels: z
    .array(channelResponseSchema)
    .nullish()
    .transform(value => value ?? undefined)
});
export const boardSchema = z.looseObject({
  boardid: optionalString,
  boardID: optionalString,
  id: optionalString,
  title: optionalString,
  account: optionalString,
  category: optionalStrings,
  graphs: z
    .array(z.unknown())
    .nullish()
    .transform(value => value ?? undefined),
  widgets: z
    .array(z.unknown())
    .nullish()
    .transform(value => value ?? undefined)
});
export const categorySchema = z.looseObject({
  id: optionalString,
  Id: optionalString,
  name: optionalString,
  type: optionalString
});
export const exclusionSchema = z.looseObject({
  id: optionalString,
  ID: optionalString,
  title: optionalString,
  active: optionalBoolean,
  apps: optionalStrings,
  hosts: optionalStrings,
  query: optionalString,
  indexonly: optionalBoolean
});
export const archiveSchema = z.looseObject({
  integration: optionalString,
  bucket: optionalString,
  endpoint: optionalString,
  resourceinstanceid: optionalString,
  accountname: optionalString,
  projectid: optionalString,
  space: optionalString
});
export type ChannelConfig = {
  integration: string;
  emails?: string[];
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  bodyTemplate?: string;
  key?: string;
  triggerlimit?: number;
  triggerinterval?: string;
  operator?: string;
  immediate?: boolean;
  terminal?: boolean;
  timezone?: string;
};
export type ViewRequest = {
  name: string;
  query?: string;
  apps?: string[];
  hosts?: string[];
  levels?: string[];
  tags?: string[];
  category?: string[];
  channels?: ChannelConfig[];
  presetId?: string;
};
export type AlertRequest = { name: string; channels: ChannelConfig[] };
export type ExclusionRuleRequest = {
  title: string;
  active?: boolean;
  apps?: string[];
  hosts?: string[];
  query?: string;
  indexonly?: boolean;
};
export type ArchiveConfig = {
  integration: string;
  bucket?: string;
  endpoint?: string;
  apikey?: string;
  resourceinstanceid?: string;
  accountname?: string;
  accountkey?: string;
  projectid?: string;
  space?: string;
  accesskey?: string;
  secretkey?: string;
  authurl?: string;
  expires?: string;
  username?: string;
  password?: string;
  tenantname?: string;
};
export type LogLine = {
  timestamp?: number;
  line: string;
  app?: string;
  level?: string;
  env?: string;
  meta?: Record<string, unknown>;
  file?: string;
};
export type IngestOptions = {
  hostname: string;
  tags?: string;
  ip?: string;
  mac?: string;
  now?: number;
};
export type ExportOptions = {
  from: number;
  to: number;
  query?: string;
  hosts?: string;
  apps?: string;
  levels?: string;
  tags?: string;
  prefer?: string;
  size?: number;
  paginationId?: string;
};
export type BoardRequest = {
  title: string;
  account?: string;
  category?: string[];
  widgets?: unknown[];
};
