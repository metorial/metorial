import type { SlateAddAttachmentInput } from 'slates';
import { type Connection, clientFor } from './client';
import { invalidResponse } from './errors';
import { deliverJobFiles } from './files';
import type { Job, Task } from './schemas';
import type { Tasks } from './validation';

export const taskSummary = (task: Task) => ({
  taskId: task.id,
  jobId: task.job_id,
  taskName: task.name,
  operation: task.operation,
  status: task.status,
  message: task.message,
  code: task.code,
  credits: task.credits,
  progress: task.percent,
  retryOfTaskId: task.retry_of_task_id,
  retryTaskIds: task.retries?.map(retry => retry.id),
  createdAt: task.created_at,
  endedAt: task.ended_at,
  resultFiles: task.result?.files
});
export const jobMessage = (job: Job, purpose: string) =>
  job.status === 'error'
    ? `${purpose} job ${job.id} failed. Inspect its task messages with get_job; repeating creation can consume credits.`
    : job.status === 'finished'
      ? `${purpose} job ${job.id} completed.`
      : `${purpose} job ${job.id} is ${job.status}. Check get_job with this ID.`;
export async function createAndRead(
  ctx: Connection & { addAttachment(input: SlateAddAttachmentInput): Promise<void> },
  tasks: Tasks,
  input: {
    tag?: string;
    waitForCompletion?: boolean;
    webhookUrl?: string;
    webhookEvents?: string[];
  }
) {
  const client = clientFor(ctx);
  let job = await client.createJob(tasks, input.tag, input.webhookUrl, input.webhookEvents);
  if (input.waitForCompletion) {
    const created = job;
    job = await client.waitForJob(job.id);
    client.confirmCreatedGraph(job, tasks, input.tag, created);
  }
  await deliverJobFiles(ctx, job);
  return job;
}
export async function readAndDeliver(
  ctx: Connection & { addAttachment(input: SlateAddAttachmentInput): Promise<void> },
  id: string,
  wait = false
) {
  const client = clientFor(ctx);
  const job = wait ? await client.waitForJob(id) : await client.getJob(id);
  await deliverJobFiles(ctx, job);
  return job;
}
export const singleResult = (job: Job) => {
  const files = job.tasks
    .filter(task => task.operation === 'export/url' && task.status === 'finished')
    .flatMap(task => task.result?.files ?? []);
  if (job.status === 'finished' && (!files.length || files.some(file => !file.url)))
    throw invalidResponse(
      `Job ${job.id} finished without a usable exported file. Inspect this existing job before creating another one.`
    );
  return {
    jobId: job.id,
    status: job.status,
    resultUrl: files[0]?.url,
    resultFilename: files[0]?.filename,
    files: files.length ? files : undefined
  };
};
