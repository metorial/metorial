import { describe, expect, it } from 'vitest';
import { body, card, field, fields, markdown, planToParts, table, text } from './index';
import { chatPartSchema } from './schema';

describe('builders', () => {
  it('builds schema-valid parts', () => {
    let built = card({
      title: 'Order #1234',
      children: [
        markdown('Total: **$50**'),
        fields([field({ label: 'Env', value: 'prod' })]),
        table({ headers: ['Item'], rows: [['Widget']] })
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
