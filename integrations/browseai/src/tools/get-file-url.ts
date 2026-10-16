import { createApiServiceError, getFileUrlTool } from 'slates';
import { z } from 'zod';
import { Client } from '../lib/client';
import { taskDataDownload } from '../lib/files';
import { optionalText } from '../lib/response';
import { spec } from '../spec';

let referenceSchema = z.object({ robotId: z.string(), taskId: z.string() });
export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let reference = referenceSchema.safeParse(ctx.input.reference);
  if (!reference.success)
    throw createApiServiceError(
      'The download reference is invalid. Run Download Task Data again.'
    );
  let task = await new Client(ctx.auth).getTask(reference.data.robotId, reference.data.taskId);
  let url = optionalText(task.capturedDataTemporaryUrl, 'task data URL');
  if (!url)
    throw createApiServiceError(
      'This task no longer has a temporary data URL. Run Download Task Data again.'
    );
  // expiresAt schedules another metadata resolution; an unchanged URL is not
  // evidence of a new provider issuance or extended provider lifetime.
  let download = taskDataDownload(url);
  return { url: download.url, expiresAt: download.refreshAt };
});
