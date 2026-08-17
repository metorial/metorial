import { describe, expect, it } from 'vitest';
import {
  actions,
  body,
  button,
  card,
  field,
  fields,
  markdown,
  modal,
  planToParts,
  table,
  text,
  textInput
} from './index';
import { chatPartSchema, modalSchema } from './schema';

describe('builders', () => {
  it('builds schema-valid parts', () => {
    let built = card({
      title: 'Order #1234',
      children: [
        markdown('Total: **$50**'),
        fields([field({ label: 'Env', value: 'prod' })]),
        table({ headers: ['Item'], rows: [['Widget']] }),
        actions([button({ id: 'approve', label: 'Approve', style: 'primary' })])
      ]
    });

    expect(chatPartSchema.parse(built).type).toBe('card');
    expect(text('Hello', { style: 'bold' })).toEqual({
      type: 'text',
      content: 'Hello',
      style: 'bold'
    });
    expect(body({ parts: [markdown('hi')] }).parts).toEqual([
      { type: 'markdown', markdown: 'hi' }
    ]);
  });

  it('builds a schema-valid modal', () => {
    let built = modal({
      title: 'Reason',
      callbackId: 'reject',
      children: [textInput({ id: 'reason', label: 'Reason' })]
    });

    expect(modalSchema.parse(built).callbackId).toBe('reject');
  });

  it('renders a plan as a card part', () => {
    let parts = planToParts({
      title: 'Rollout',
      tasks: [
        { id: '1', title: 'Build', status: 'complete' },
        { id: '2', title: 'Deploy', status: 'in_progress', details: 'prod' }
      ]
    });

    expect(parts[0]?.type).toBe('card');
    expect(chatPartSchema.parse(parts[0]!)).toMatchObject({ title: 'Rollout' });
  });
});
