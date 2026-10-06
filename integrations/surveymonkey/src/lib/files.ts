import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { z } from 'zod';
import { id, invalid, malformed, parse, type responseSchema } from './response';

let record = z.record(z.string(), z.unknown());
let layout = z.array(
  z
    .object({
      id,
      questions: z.array(z.object({ id, answers: z.array(record) }).passthrough())
    })
    .passthrough()
);
export let fileReference = z
  .object({
    surveyId: id,
    responseId: id,
    pageId: id,
    questionId: id,
    answerIndex: z.number().int().nonnegative().max(999),
    userId: id,
    apiOrigin: z.string(),
    fileOrigin: z.string(),
    filePath: z.string(),
    identity: z.string().regex(/^[a-f0-9]{64}$/),
    mimeType: z.string()
  })
  .strict();
export let signedFile = (raw: unknown) => {
  if (typeof raw !== 'string') throw malformed();
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw malformed();
  }
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    (url.port && url.port !== '443') ||
    isIP(url.hostname) ||
    !url.hostname.includes('.') ||
    /(^|\.)(localhost|local|internal|invalid|test)$/.test(url.hostname)
  )
    throw invalid(
      'The provider returned an unsupported file URL. Request response details again.'
    );
  let expiry = url.searchParams.get('Expires');
  if (!expiry || !/^\d+$/.test(expiry))
    throw invalid(
      'The provider file URL has no documented expiration. Request response details again.'
    );
  let expiresAt = Number(expiry) * 1000;
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now() ||
    expiresAt > Date.now() + 13 * 60 * 60 * 1000
  )
    throw invalid(
      'The provider file URL has an invalid or expired timestamp. Request response details again.'
    );
  return {
    url: url.toString(),
    origin: url.origin,
    path: url.pathname,
    expiresAt: new Date(expiresAt).toISOString()
  };
};
let fingerprint = (answer: Record<string, unknown>) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        Object.fromEntries(
          Object.entries(answer)
            .filter(
              ([key]) =>
                !['download_url', 'human_download_url', 'download_url_error'].includes(key)
            )
            .sort(([a], [b]) => a.localeCompare(b))
        )
      )
    )
    .digest('hex');
export let responseFiles = (response: z.output<typeof responseSchema>) => {
  if (response.pages === undefined) throw malformed();
  let files: Array<{
    pageId: string;
    questionId: string;
    answerIndex: number;
    identity: string;
    filename: string;
    mimeType: string;
    url: string;
    origin: string;
    path: string;
    expiresAt: string;
  }> = [];
  for (let page of parse(layout, response.pages))
    for (let question of page.questions)
      question.answers.forEach((answer, answerIndex) => {
        if (answer.download_url === undefined || answer.download_url === null) return;
        if (files.length >= 20)
          throw invalid('A response can deliver at most 20 uploaded files in one request.');
        let file = signedFile(answer.download_url);
        if (
          typeof answer.content_type !== 'string' ||
          !/^[\w!#$&^.+-]+\/[\w!#$&^.+-]+$/.test(answer.content_type)
        )
          throw malformed();
        let filename =
          typeof answer.text === 'string'
            ? answer.text
                .split(/[\\/]/)
                .at(-1)
                ?.replace(/[^A-Za-z0-9._ -]/g, '_')
                .slice(0, 120)
            : undefined;
        files.push({
          ...file,
          pageId: page.id,
          questionId: question.id,
          answerIndex,
          identity: fingerprint(answer),
          filename: filename || `response-${response.id}-${question.id}-${answerIndex}`,
          mimeType: answer.content_type
        });
      });
  return files;
};
