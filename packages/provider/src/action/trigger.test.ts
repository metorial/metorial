import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SlateAuth } from '../auth';
import { SlateConfig } from '../config';
import { SlateSpecification } from '../specification/specification';
import { SlateTool } from './tool';
import { SlateTrigger } from './trigger';
import { triggerGroup } from './triggerGroup';

let spec = SlateSpecification.create({
  key: 'demo',
  name: 'Demo',
  config: SlateConfig.create(z.object({})),
  auth: SlateAuth.create<{}>().output(z.object({}))
});

let group = triggerGroup(spec, { key: 'group', name: 'Group' })
  .polling({ pollEvents: async () => ({ events: [] }) })
  .routingMatchers(async () => [])
  .build();

let output = z.object({
  fileId: z.string(),
  parents: z.array(z.string()),
  size: z.number().optional()
});

let create = () =>
  SlateTrigger.create(spec, { key: 'changed', name: 'Changed' })
    .input(z.object({}))
    .triggerGroup(group)
    .matches(() => true)
    .map(async () => ({
      type: 'file.changed',
      id: '1',
      output: { fileId: 'a', parents: [] }
    }));

describe('trigger event attributes', () => {
  it('exposes the declared fields on the built trigger', () => {
    let trigger = create().output(output).eventAttributes(['fileId', 'parents']).build();

    expect(trigger.eventAttributes).toEqual(['fileId', 'parents']);
  });

  it('is empty when none are declared', () => {
    expect(create().output(output).build().eventAttributes).toEqual([]);
  });

  it('checks the fields against an output schema set after the declaration', () => {
    expect(
      create()
        .eventAttributes(['fileId'] as never[])
        .output(output)
        .build().eventAttributes
    ).toEqual(['fileId']);

    expect(() =>
      create()
        .eventAttributes(['folderId'] as never[])
        .output(output)
        .build()
    ).toThrow('Event attribute "folderId" is not a top-level property of the output schema');
  });

  it('rejects fields that are not top-level output properties', () => {
    expect(() =>
      create()
        .output(output)
        .eventAttributes(['folderId' as any])
    ).toThrow('Event attribute "folderId" is not a top-level property of the output schema');
  });

  it('requires the output schema to be a zod object', () => {
    expect(() =>
      create()
        .output(z.record(z.string(), z.string()) as unknown as z.ZodType<{ fileId: string }>)
        .eventAttributes(['fileId'])
    ).toThrow('Event attributes require the output schema to be a zod object');

    expect(() =>
      create()
        .eventAttributes(['fileId'] as never[])
        .output(z.record(z.string(), z.string()) as unknown as z.ZodType<{ fileId: string }>)
        .build()
    ).toThrow('Event attributes require the output schema to be a zod object');
  });

  it('rejects names that do not match the key pattern', () => {
    let schema = z.object({ _id: z.string(), '1st': z.string(), 'a-b': z.string() });
    for (let field of ['_id', '1st', 'a-b']) {
      expect(() =>
        create()
          .output(schema)
          .eventAttributes([field as any])
      ).toThrow(`Event attribute "${field}" must start with a letter`);
    }

    let long = 'a'.repeat(65);
    expect(() => create().eventAttributes([long as never])).toThrow(
      `Event attribute "${long}" must start with a letter`
    );
  });

  it('rejects duplicates', () => {
    expect(() => create().output(output).eventAttributes(['fileId', 'fileId'])).toThrow(
      'Event attribute "fileId" is declared more than once'
    );
  });

  it('allows at most eight fields', () => {
    let fields = Array.from({ length: 9 }, (_, i) => `field${i}`);
    let schema = z.object(Object.fromEntries(fields.map(field => [field, z.string()])));

    expect(
      create().output(schema).eventAttributes(fields.slice(0, 8)).build().eventAttributes
    ).toHaveLength(8);
    expect(() => create().output(schema).eventAttributes(fields)).toThrow(
      'A trigger can declare at most 8 event attributes'
    );
  });

  it('can only be declared on triggers', () => {
    let tool = SlateTool.create(spec, { key: 'send', name: 'Send' })
      .input(z.object({}))
      .output(z.object({ id: z.string() }));

    expect(() => tool.eventAttributes(['id'])).toThrow(
      'eventAttributes can only be set for trigger actions'
    );
  });
});
