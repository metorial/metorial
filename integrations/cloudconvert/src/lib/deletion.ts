import { ServiceError } from '@lowerdeck/error';
import type { Client } from './client';
import { invalidResponse } from './errors';

const notFound = (error: unknown) =>
  error instanceof ServiceError && Number(error.data.upstreamStatus) === 404;
export async function deleteAndConfirm(client: Client, kind: 'job' | 'task', id: string) {
  const read = () => (kind === 'job' ? client.getJob(id) : client.getTask(id));
  await read();
  if (kind === 'job') await client.deleteJob(id);
  else await client.deleteTask(id);
  try {
    await read();
  } catch (error) {
    if (notFound(error)) return;
    throw invalidResponse(
      `Deletion of ${kind} ${id} was accepted, but absence could not be verified. Read this exact resource before attempting another deletion.`
    );
  }
  throw invalidResponse(
    `Deletion of ${kind} ${id} was accepted, but the resource is still readable. Cleanup is not confirmed.`
  );
}
