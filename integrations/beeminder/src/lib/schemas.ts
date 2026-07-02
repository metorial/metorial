import { z } from 'zod';

export let goalSchema = z.object({
  slug: z.string().describe('URL-friendly name for the goal'),
  title: z.string().describe('Human-readable title'),
  goalType: z
    .string()
    .describe('Goal type (hustler, biker, fatloser, gainer, inboxer, drinker, custom)'),
  gunits: z.string().describe('Units for the goal'),
  goaldate: z.number().nullable().optional().describe('Unix timestamp of the goal end date'),
  goalval: z.number().nullable().optional().describe('Target value at the goal date'),
  rate: z.number().nullable().optional().describe('Rate of change required (per day)'),
  curval: z.number().optional().describe('Current value on the bright red line'),
  curday: z.number().optional().describe('Current day as unix timestamp'),
  pledge: z.number().optional().describe('Current pledge amount in USD'),
  yaxis: z.string().optional().describe('Y-axis label'),
  safebuf: z.number().optional().describe('Number of safe days before derailment'),
  safesum: z.string().optional().describe('Human-readable summary of the safety buffer'),
  losedate: z
    .number()
    .optional()
    .describe('Unix timestamp when the goal will derail if no data is added'),
  limsum: z.string().optional().describe('Summary of how much is needed before the deadline'),
  deadline: z.number().optional().describe('Seconds after midnight for the goal deadline'),
  secret: z.boolean().optional().describe('Whether the goal is secret'),
  datapublic: z.boolean().optional().describe('Whether the data is public'),
  tags: z.array(z.string()).optional().describe('Tags associated with the goal'),
  updatedAt: z.number().optional().describe('Unix timestamp of last update'),
  burner: z.string().optional().describe('Whether the goal is on the front or back burner'),
  roadall: z
    .array(z.any())
    .optional()
    .describe('Full road matrix (bright red line specification)'),
  callbackUrl: z
    .string()
    .nullable()
    .optional()
    .describe('Webhook URL for derail notifications'),
  autodata: z.string().nullable().optional().describe('Automatic data source name'),
  won: z.boolean().optional().describe('Whether the goal has been won'),
  lane: z
    .number()
    .optional()
    .describe('Current lane position (1=red, 2=orange, 3=blue, 4=green)'),
  mathishard: z.array(z.number()).optional().describe('Summary of the road ahead'),
  headsum: z.string().optional().describe('Summary of the goal status'),
  lastDatapoint: z.any().optional().describe('Most recent datapoint'),
  integery: z.boolean().optional().describe('Whether the goal values are integers'),
  fineprint: z.string().nullable().optional().describe('Fine print for the goal'),
  todayta: z.boolean().optional().describe('Whether there is data for today'),
  hhmmformat: z.boolean().optional().describe('Whether values are in HH:MM format'),
  id: z.string().optional().describe('Unique goal identifier')
});

export let datapointSchema = z.object({
  datapointId: z.string().describe('Unique identifier for the datapoint'),
  timestamp: z.number().describe('Unix timestamp of the datapoint'),
  daystamp: z.string().describe('Date stamp in YYYYMMDD format'),
  value: z.number().describe('Numeric value of the datapoint'),
  comment: z.string().optional().describe('Optional comment on the datapoint'),
  requestid: z
    .string()
    .nullable()
    .optional()
    .describe('Client-provided unique ID for idempotent upserts'),
  updatedAt: z.number().optional().describe('Unix timestamp of last update'),
  goalSlug: z.string().optional().describe('Slug of the parent goal')
});

export let userSchema = z.object({
  username: z.string().describe('Beeminder username'),
  timezone: z.string().optional().describe('User timezone'),
  updatedAt: z.number().optional().describe('Unix timestamp of last update'),
  deadbeat: z.boolean().optional().describe('Whether the user has failed to pay'),
  urgencyLoad: z.number().optional().describe('Total urgency across all goals'),
  hasAuthorizedSources: z
    .boolean()
    .optional()
    .describe('Whether user has authorized third-party sources')
});

export let chargeSchema = z.object({
  chargeId: z.string().optional().describe('Unique identifier for the charge'),
  amount: z.number().describe('Charge amount in USD'),
  note: z.string().optional().describe('Note attached to the charge'),
  userId: z.string().describe('Username of the charged user')
});

export let mapGoal = (raw: any) => ({
  slug: raw.slug,
  title: raw.title,
  goalType: raw.goal_type,
  gunits: raw.gunits,
  goaldate: raw.goaldate ?? null,
  goalval: raw.goalval ?? null,
  rate: raw.rate ?? null,
  curval: raw.curval,
  curday: raw.curday,
  pledge: raw.pledge,
  yaxis: raw.yaxis,
  safebuf: raw.safebuf,
  safesum: raw.safesum,
  losedate: raw.losedate,
  limsum: raw.limsum,
  deadline: raw.deadline,
  secret: raw.secret,
  datapublic: raw.datapublic,
  tags: raw.tags ?? [],
  updatedAt: raw.updated_at,
  burner: raw.burner,
  roadall: raw.roadall,
  callbackUrl: raw.callback_url ?? null,
  autodata: raw.autodata ?? null,
  won: raw.won,
  lane: raw.lane,
  mathishard: raw.mathishard,
  headsum: raw.headsum,
  lastDatapoint: raw.last_datapoint,
  integery: raw.integery,
  fineprint: raw.fineprint ?? null,
  todayta: raw.todayta,
  hhmmformat: raw.hhmmformat,
  id: raw.id
});

export let mapDatapoint = (raw: any) => ({
  datapointId: raw.id,
  timestamp: raw.timestamp,
  daystamp: raw.daystamp,
  value: raw.value,
  comment: raw.comment || '',
  requestid: raw.requestid ?? null,
  updatedAt: raw.updated_at,
  goalSlug: raw.goal_slug
});

export let mapUser = (raw: any) => ({
  username: raw.username,
  timezone: raw.timezone,
  updatedAt: raw.updated_at,
  deadbeat: raw.deadbeat,
  urgencyLoad: raw.urgency_load,
  hasAuthorizedSources: raw.has_authorized_sources
});
