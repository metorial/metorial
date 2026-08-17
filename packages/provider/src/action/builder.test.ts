import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { SlateAuth } from '../auth';
import { SlateConfig } from '../config';
import { SlateSpecification } from '../specification/specification';
import { SlateTool } from './tool';

let createTestSpec = () => {
  let config = SlateConfig.create(z.object({}));
  let auth = SlateAuth.create<{}>().output(z.object({}));

  return SlateSpecification.create({
    key: 'demo',
    name: 'Demo',
    config,
    auth
  });
};

describe('SlateActionBuilder.lockInterface', () => {
  it('prevents changing input and output schemas after the interface is locked', () => {
    let spec = createTestSpec();
    let builder = SlateTool.create(spec, {
      key: 'send',
      name: 'Send'
    })
      .input(z.object({ to: z.string() }))
      .output(z.object({ id: z.string() }))
      .lockInterface();

    expect(() => builder.input(z.object({}))).toThrow(
      'Adapter contract input schema cannot be changed'
    );
    expect(() => builder.output(z.object({}))).toThrow(
      'Adapter contract output schema cannot be changed'
    );
  });
});
