import { describe, expect, it } from 'vitest';
import { type SlateLogEntry, SlateLogger } from './logger';

let flushLogs = async () => {
  await new Promise(resolve => setTimeout(resolve, 20));
};

describe('SlateLogger', () => {
  it('keeps a readable message and structured data for object logs', async () => {
    let entries: SlateLogEntry[] = [];
    let logger = new SlateLogger([
      batch => {
        entries.push(...batch);
      }
    ]);

    logger.info({
      message: 'Invoking tool action',
      providerId: 'demo-slate',
      actionId: 'echo',
      phase: 'start'
    });

    await flushLogs();

    expect(entries[0]).toMatchObject({
      type: 'info',
      message: 'Invoking tool action',
      data: {
        providerId: 'demo-slate',
        actionId: 'echo',
        phase: 'start'
      }
    });
  });

  it('captures error details as structured metadata', async () => {
    let entries: SlateLogEntry[] = [];
    let logger = new SlateLogger([
      batch => {
        entries.push(...batch);
      }
    ]);

    logger.error(new Error('boom'));

    await flushLogs();

    expect(entries[0]?.message).toBe('Error: boom');
    expect(entries[0]?.data).toMatchObject({
      error: {
        name: 'Error',
        message: 'boom'
      }
    });
  });
});
