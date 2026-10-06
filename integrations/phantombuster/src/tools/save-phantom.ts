import { createApiServiceError, isApiErrorRecord, pickDefined, SlateTool } from 'slates';
import { z } from 'zod';
import { Client, identifier, matchingId, type Row, text } from '../lib/client';
import { spec } from '../spec';

export let savePhantom = SlateTool.create(spec, {
  name: 'Save Phantom',
  key: 'save_phantom',
  description:
    'Create or update an individual Phantom. Provide phantomId to update; creation requires a name and either an existing scriptId or an exact script name. Current public templates use scriptOrg "phantombuster" and branch "master". This does not launch the Phantom; scheduling and notification settings can have external effects.',
  tags: { readOnly: false, destructive: true }
})
  .input(
    z.object({
      phantomId: z
        .string()
        .optional()
        .describe('ID of an existing Phantom to update. Omit to create a new one.'),
      name: z.string().optional().describe('Name for the Phantom'),
      scriptId: z
        .string()
        .optional()
        .describe('ID of the script to associate with the Phantom'),
      script: z
        .string()
        .optional()
        .describe(
          'Exact case-sensitive script name, including .js or .coffee. For public templates, copy the name from its Solutions page.'
        ),
      scriptOrg: z
        .string()
        .optional()
        .describe(
          'Script owner organization name. Public templates use phantombuster; custom scripts require their actual owner.'
        ),
      branch: z.string().optional().describe('Script branch. Public templates use master.'),
      repeatedLaunchTimes: z
        .record(z.string(), z.any())
        .optional()
        .describe(
          'Provider schedule object, required for repeatedly unless an existing schedule is retained.'
        ),
      launchOnceAt: z
        .number()
        .optional()
        .describe('Unix timestamp in milliseconds for once scheduling.'),
      launchAfterAgentId: z
        .string()
        .optional()
        .describe('Predecessor Phantom ID for after agent scheduling.'),
      argument: z
        .record(z.string(), z.any())
        .optional()
        .describe('Default argument/configuration for the Phantom'),
      launchType: z
        .string()
        .optional()
        .describe('Launch type (e.g., "manually", "repeatedly")'),
      executionTimeLimit: z.number().optional().describe('Maximum execution time in seconds'),
      notifications: z
        .record(z.string(), z.any())
        .optional()
        .describe('Notification settings including webhook URL')
    })
  )
  .output(
    z.object({
      phantomId: z.string().describe('ID of the created or updated Phantom'),
      name: z.string().optional().describe('Name of the Phantom')
    })
  )
  .handleInvocation(async ctx => {
    let client = new Client({ token: ctx.auth.token });

    const body: Row = pickDefined({
      id:
        ctx.input.phantomId === undefined
          ? undefined
          : identifier(ctx.input.phantomId, 'Phantom ID'),
      name: ctx.input.name,
      argument: ctx.input.argument,
      launchType: ctx.input.launchType,
      executionTimeLimit: ctx.input.executionTimeLimit,
      notifications: ctx.input.notifications,
      repeatedLaunchTimes: ctx.input.repeatedLaunchTimes,
      launchOnceAt: ctx.input.launchOnceAt,
      launchAfterAgentId: ctx.input.launchAfterAgentId
    });
    if (ctx.input.name !== undefined && !ctx.input.name.trim())
      throw createApiServiceError('Provide a nonempty Phantom name.');
    if (
      ctx.input.executionTimeLimit !== undefined &&
      (!Number.isFinite(ctx.input.executionTimeLimit) || ctx.input.executionTimeLimit < 0)
    )
      throw createApiServiceError('Execution time limit must be nonnegative.');
    if (ctx.input.scriptId !== undefined) {
      const script = await client.fetchScript(ctx.input.scriptId, ctx.input.branch);
      matchingId(script.id, ctx.input.scriptId, 'Script ID');
      const scriptName = text(script.name ?? script.script);
      const ownerCandidate =
        text(script.orgName ?? script.org) ??
        (isApiErrorRecord(script.org) ? text(script.org.name) : undefined);
      const owner =
        ownerCandidate &&
        /^(deleted_\d{1,16}-)?[a-z][a-z0-9-_]{1,48}[a-z0-9_]$/.test(ownerCandidate)
          ? ownerCandidate
          : undefined;
      if (!scriptName || (!owner && !ctx.input.scriptOrg))
        throw createApiServiceError(
          'The script lookup did not identify its name and owner. Provide the exact script, scriptOrg and branch instead.'
        );
      if (
        (ctx.input.script && ctx.input.script !== scriptName) ||
        (owner && ctx.input.scriptOrg && owner !== ctx.input.scriptOrg)
      )
        throw createApiServiceError(
          'The explicit script name or owner conflicts with scriptId.'
        );
      body.script = scriptName;
      body.org = ctx.input.scriptOrg ?? owner;
      body.branch = ctx.input.branch ?? text(script.branch) ?? 'master';
    } else if (ctx.input.script !== undefined) {
      body.script = ctx.input.script;
      body.org = ctx.input.scriptOrg ?? 'phantombuster';
      body.branch = ctx.input.branch ?? 'master';
    } else if (ctx.input.scriptOrg !== undefined || ctx.input.branch !== undefined) {
      throw createApiServiceError('Provide script or scriptId with scriptOrg or branch.');
    }
    if (
      body.script !== undefined &&
      (typeof body.script !== 'string' ||
        !/^\w([\w. -]{0,48}\w)?\.(?:coffee|js)$/.test(body.script))
    )
      throw createApiServiceError(
        'Use the exact provider script name, including its .js or .coffee extension.'
      );
    if (
      body.org !== undefined &&
      (typeof body.org !== 'string' ||
        !/^(deleted_\d{1,16}-)?[a-z][a-z0-9-_]{1,48}[a-z0-9_]$/.test(body.org))
    )
      throw createApiServiceError(
        'Use the script owner organization name, rather than an organization ID or display name.'
      );
    if (
      body.branch !== undefined &&
      (typeof body.branch !== 'string' || !/^[\w-]{1,50}$/.test(body.branch))
    )
      throw createApiServiceError('Use a valid script branch name.');
    if (!ctx.input.phantomId && (!ctx.input.name || !body.script))
      throw createApiServiceError('Creation requires name and either scriptId or script.');
    if (
      ctx.input.launchType !== undefined &&
      !['manually', 'repeatedly', 'once', 'after agent'].includes(ctx.input.launchType)
    )
      throw createApiServiceError(
        'Choose manually, repeatedly, once or after agent as launchType.'
      );
    if (
      !ctx.input.phantomId &&
      ((ctx.input.launchType === 'repeatedly' && !ctx.input.repeatedLaunchTimes) ||
        (ctx.input.launchType === 'once' && ctx.input.launchOnceAt === undefined) ||
        (ctx.input.launchType === 'after agent' && !ctx.input.launchAfterAgentId))
    )
      throw createApiServiceError('Provide the required schedule fields for this launchType.');
    if (Object.keys(body).length === 1 && body.id)
      throw createApiServiceError('Provide at least one setting to update.');
    const result = await client.saveAgent(body);
    const returnedId = isApiErrorRecord(result) ? (result.id ?? result.agentId) : result;
    const phantomId = ctx.input.phantomId
      ? returnedId === undefined || returnedId === null
        ? ctx.input.phantomId
        : matchingId(returnedId, ctx.input.phantomId, 'Phantom ID')
      : identifier(returnedId, 'Created Phantom ID');
    const saved = await client.fetchAgent(phantomId);
    if (ctx.input.name !== undefined && saved.name !== ctx.input.name)
      throw createApiServiceError(
        'The saved Phantom name did not match. Inspect the Phantom before retrying.',
        { reason: 'invalid_response' }
      );
    return {
      output: { phantomId, name: text(saved.name) },
      message: `${ctx.input.phantomId ? 'Updated' : 'Created'} Phantom **${phantomId}**.`
    };
  })
  .build();
