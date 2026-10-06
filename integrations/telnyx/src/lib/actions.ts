import { httpUrl, integer, invalid, type Row, required } from './native';

const actions = new Set([
  'answer',
  'hangup',
  'transfer',
  'bridge',
  'speak',
  'playback_start',
  'send_dtmf',
  'record_start',
  'record_stop',
  'record_pause',
  'record_resume',
  'gather_using_speak',
  'gather_using_audio',
  'gather_stop',
  'enqueue',
  'leave_queue',
  'fork_start',
  'fork_stop'
]);
export function validateCallAction(action: string, params: Row) {
  if (!actions.has(action)) invalid('Select a supported call action.');
  const text = (key: string) => {
    const value = params[key];
    if (typeof value !== 'string') invalid(`Provide ${key} in actionParams for ${action}.`);
    return required(
      value,
      key,
      key === 'payload' ? 3000 : key === 'playback_content' ? 8 * 1024 * 1024 : 2048
    );
  };
  if (action === 'speak' || action === 'gather_using_speak') {
    if (text('payload').length > 3000)
      invalid('Speech payload must contain at most 3000 characters.');
    text('voice');
  }
  if (action === 'playback_start' || action === 'gather_using_audio') {
    const sources = (
      action === 'playback_start'
        ? ['audio_url', 'media_name', 'playback_content']
        : ['audio_url', 'media_name']
    ).filter(key => params[key] !== undefined);
    if (action === 'gather_using_audio' && params.playback_content !== undefined)
      invalid(
        'gather_using_audio does not document playback_content; use audio_url or media_name.'
      );
    if (sources.length !== 1)
      invalid('Provide exactly one supported audio source in actionParams.');
    const source = sources[0]!;
    if (source === 'audio_url') httpUrl(text(source), 'audio URL');
    else text(source);
  }
  if (action === 'transfer') text('to');
  if (action === 'bridge') {
    if (
      ['call_control_id', 'queue', 'video_room_id'].filter(key => params[key] !== undefined)
        .length !== 1
    )
      invalid('Provide exactly one bridge target: call_control_id, queue, or video_room_id.');
  }
  if (action === 'send_dtmf') {
    if (!/^[0-9A-D*#wW]+$/.test(text('digits')))
      invalid('DTMF digits must contain 0-9, A-D, *, #, w, or W.');
    if (params.duration_millis !== undefined)
      integer(params.duration_millis, 'duration_millis', 100, 500);
  }
  if (action === 'record_start') {
    if (!['wav', 'mp3'].includes(text('format')))
      invalid('Recording format must be wav or mp3.');
    if (!['single', 'dual'].includes(text('channels')))
      invalid('Recording channels must be single or dual.');
    if (params.max_length !== undefined) integer(params.max_length, 'max_length', 0, 14_400);
  }
  if (action === 'enqueue') text('queue_name');
  if (action === 'fork_start') {
    if (params.stream_type === undefined || params.stream_type === 'decrypted') {
      text('rx');
      text('tx');
    }
  }
}
