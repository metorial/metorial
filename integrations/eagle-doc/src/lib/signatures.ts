import { isApiErrorRecord, type SlateAddAttachmentInput } from 'slates';

export let addSignatureImages = async (
  ctx: { addAttachment: (input: SlateAddAttachmentInput) => Promise<void> },
  signatures: unknown
): Promise<void> => {
  if (!Array.isArray(signatures)) return;
  for (let [index, signature] of signatures.entries()) {
    if (!isApiErrorRecord(signature)) continue;
    let image =
      typeof signature.image === 'string' && signature.image
        ? signature.image
        : typeof signature.binary === 'string'
          ? signature.binary
          : undefined;
    if (!image) continue;
    let bytes = Buffer.from(image, 'base64');
    if (!bytes.length) continue;
    let png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    let jpeg = bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
    let mimeType = png ? 'image/png' : jpeg ? 'image/jpeg' : 'application/octet-stream';
    let extension = png ? 'png' : jpeg ? 'jpg' : 'bin';
    await ctx.addAttachment({
      type: 'content',
      content: new Response(new Uint8Array(bytes), { headers: { 'content-type': mimeType } }),
      mimeType,
      filename: `signature-${index + 1}.${extension}`
    });
  }
};
