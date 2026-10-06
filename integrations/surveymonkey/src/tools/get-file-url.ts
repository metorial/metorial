import { getFileUrlTool } from 'slates';
import { Client } from '../lib/client';
import { fileReference, responseFiles, signedFile } from '../lib/files';
import { invalid } from '../lib/response';
import { spec } from '../spec';
export let getFileUrl = getFileUrlTool(spec, async ctx => {
  let result = fileReference.safeParse(ctx.input.reference);
  if (!result.success)
    throw invalid('Request response details again to obtain a valid file reference.');
  let reference = result.data;
  let old = signedFileForIdentity(ctx.input.url);
  if (old.origin !== reference.fileOrigin || old.pathname !== reference.filePath)
    throw invalid('The file reference no longer matches the original file.');
  let client = new Client(ctx.auth);
  let user = await client.getCurrentUser();
  if (client.origin !== reference.apiOrigin || user.id !== reference.userId)
    throw invalid(
      'The authorized account or API region changed. Request the response file again.'
    );
  let response = await client.getResponse(reference.surveyId, reference.responseId);
  if (response.survey_id !== reference.surveyId)
    throw invalid('The response no longer proves its original survey association.');
  let file = responseFiles(response).find(
    file =>
      file.pageId === reference.pageId &&
      file.questionId === reference.questionId &&
      file.answerIndex === reference.answerIndex
  );
  if (
    !file ||
    file.identity !== reference.identity ||
    file.origin !== reference.fileOrigin ||
    file.path !== reference.filePath ||
    file.mimeType !== reference.mimeType
  )
    throw invalid(
      'The uploaded file changed or is no longer available. Request response details again.'
    );
  let fresh = signedFile(file.url);
  return { url: fresh.url, expiresAt: fresh.expiresAt, headers: {}, query: {} };
});
function signedFileForIdentity(raw: string) {
  try {
    return new URL(raw);
  } catch {
    throw invalid('The original file URL is invalid.');
  }
}
