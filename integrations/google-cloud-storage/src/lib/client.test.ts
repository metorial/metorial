import { Buffer } from 'node:buffer';
import { beforeEach, describe, expect, it, vi } from 'vitest';

let mocks = vi.hoisted(() => ({
  http: { get: vi.fn() },
  createAxios: vi.fn()
}));

vi.mock('slates', async importOriginal => {
  let actual = await importOriginal<typeof import('slates')>();
  return { ...actual, createAxios: mocks.createAxios };
});

import { Client } from './client';

beforeEach(() => {
  mocks.http.get.mockReset();
  mocks.createAxios.mockReset();
  mocks.createAxios.mockReturnValue(mocks.http);
});

describe('Cloud Storage object downloads', () => {
  it('requests arraybuffer data and preserves arbitrary binary bytes', async () => {
    let binary = Buffer.from([0, 255, 1, 128, 10]);
    mocks.http.get.mockResolvedValue({ data: binary });

    let client = new Client({ token: 'access-token', projectId: 'example-project' });
    let downloaded = await client.downloadObject('bucket-name', 'images/sample.bin');

    expect(downloaded).toEqual(binary);
    expect(mocks.http.get).toHaveBeenCalledWith('/b/bucket-name/o/images%2Fsample.bin', {
      params: { alt: 'media' },
      responseType: 'arraybuffer'
    });
  });
});
