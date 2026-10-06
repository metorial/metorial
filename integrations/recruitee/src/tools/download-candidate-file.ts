import { SlateTool } from 'slates';
import { z } from 'zod';
import { RecruiteeClient } from '../lib/client';
import { fail, integer, url } from '../lib/validation';
import { spec } from '../spec';
export let downloadCandidateFile = SlateTool.create(spec, {
  name: 'Download Candidate File',
  key: 'download_candidate_file',
  description:
    'Prepare the candidate’s current CV, uploaded cover letter, or an exact candidate file for download. Requires an existing file and permission to read that candidate. A cover-letter text field is not a downloadable file.',
  tags: { readOnly: true }
})
  .input(
    z.object({
      candidateId: z.number(),
      fileType: z.enum(['cv', 'cover_letter', 'attachment']),
      attachmentId: z.number().optional().describe('Required exact file ID for attachment')
    })
  )
  .output(
    z.object({
      candidateId: z.number(),
      fileType: z.string(),
      fileName: z.string(),
      attachmentId: z.number().optional(),
      mimeType: z.string().optional()
    })
  )
  .handleInvocation(async ctx => {
    integer(ctx.input.candidateId, 'Candidate ID');
    if (ctx.input.fileType === 'attachment')
      integer(ctx.input.attachmentId, 'Candidate file ID');
    else if (ctx.input.attachmentId !== undefined)
      fail('attachmentId is only used for attachment files.');
    const client = await RecruiteeClient.forContext(ctx);
    const candidate = (await client.getCandidate(ctx.input.candidateId)).candidate;
    let nativeUrl: unknown,
      fileName = `candidate-${candidate.id}-${ctx.input.fileType}`,
      mimeType: string | undefined;
    if (ctx.input.fileType === 'cv') nativeUrl = candidate.cv_original_url ?? candidate.cv_url;
    else if (ctx.input.fileType === 'cover_letter')
      nativeUrl = candidate.cover_letter_file_original_url ?? candidate.cover_letter_file_url;
    else {
      const file = (await client.candidateAttachments(candidate.id)).find(
        item => item.id === ctx.input.attachmentId
      );
      if (!file)
        fail('That file is not listed on the requested candidate. No download was prepared.');
      if (
        file.candidate_id !== undefined &&
        file.candidate_id !== null &&
        file.candidate_id !== candidate.id
      )
        fail('The file belongs to a different candidate.');
      nativeUrl = file.file_url;
      if (typeof file.filename === 'string' && file.filename.trim())
        fileName = file.filename.replace(/[^a-zA-Z0-9._ -]/g, '_').slice(0, 180);
      if (fileName === '.' || fileName === '..')
        fileName = `candidate-${candidate.id}-attachment-${ctx.input.attachmentId}`;
      if (
        typeof file.content_type === 'string' &&
        /^[a-zA-Z0-9.+-]+\/[a-zA-Z0-9.+-]+$/.test(file.content_type)
      )
        mimeType = file.content_type;
    }
    if (nativeUrl === undefined || nativeUrl === null || nativeUrl === '')
      fail('No downloadable file is available. Upload it in Recruitee before retrying.');
    if (typeof nativeUrl === 'string' && nativeUrl.includes('[redacted'))
      fail(
        'The provider file URL could not be retained safely. Download the file in Recruitee instead.'
      );
    const downloadUrl = url(nativeUrl, 'Provider file URL');
    if (
      downloadUrl.includes(ctx.auth.token) ||
      downloadUrl.includes(encodeURIComponent(ctx.auth.token))
    )
      fail(
        'The provider file URL contains an authentication credential. Download the file in Recruitee instead.'
      );
    await ctx.addAttachment({
      type: 'url',
      url: downloadUrl,
      filename: fileName,
      ...(mimeType ? { mimeType } : {}),
      ...(new URL(downloadUrl).origin === 'https://api.recruitee.com'
        ? { headers: { Authorization: `Bearer ${ctx.auth.token}` } }
        : {})
    });
    return {
      output: {
        candidateId: candidate.id,
        fileType: ctx.input.fileType,
        fileName,
        ...(ctx.input.fileType === 'attachment'
          ? { attachmentId: ctx.input.attachmentId }
          : {}),
        ...(mimeType ? { mimeType } : {})
      },
      message: `Prepared ${fileName} for download.`
    };
  })
  .build();
