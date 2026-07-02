import { ServiceError } from '@lowerdeck/error';
import { describe, expect, it } from 'vitest';
import {
  buildRepresentativeAvailabilityRequest,
  buildTranscriptExportRequest,
  resolveResource
} from './index';

describe('Dynamics 365 Contact Center resource defaults', () => {
  it('uses documented primary columns for session records', () => {
    expect(resolveResource('session').defaultSelect).toEqual([
      'activityid',
      'subject',
      'msdyn_liveworkitemid',
      'msdyn_sessionid',
      'statecode',
      'statuscode',
      'createdon',
      'modifiedon'
    ]);
  });

  it('uses the documented routing request primary name column', () => {
    expect(resolveResource('routing_state').defaultSelect).toContain(
      'msdyn_entitylogicalname'
    );
    expect(resolveResource('routing_state').defaultSelect).not.toContain('msdyn_name');
  });
});

describe('buildTranscriptExportRequest', () => {
  it('downloads the official formatted transcript file column by default', () => {
    expect(
      buildTranscriptExportRequest({
        transcriptId: ' 11111111-1111-1111-1111-111111111111 '
      })
    ).toEqual({
      transcriptId: '11111111-1111-1111-1111-111111111111',
      entitySetName: 'msdyn_transcripts',
      fileColumn: 'msdyn_voicetranscript_formatted',
      fileName: 'transcript-11111111-1111-1111-1111-111111111111.txt',
      mimeType: 'text/plain'
    });
  });

  it('allows tenant-specific transcript file column overrides', () => {
    expect(
      buildTranscriptExportRequest({
        transcriptId: '22222222-2222-2222-2222-222222222222',
        entitySetNameOverride: ' custom_transcripts ',
        fileColumn: ' custom_transcriptfile ',
        fileName: ' custom.txt ',
        mimeType: ' text/markdown '
      })
    ).toEqual({
      transcriptId: '22222222-2222-2222-2222-222222222222',
      entitySetName: 'custom_transcripts',
      fileColumn: 'custom_transcriptfile',
      fileName: 'custom.txt',
      mimeType: 'text/markdown'
    });
  });

  it('rejects conflicting transcript file column inputs with ServiceError', () => {
    expect(() =>
      buildTranscriptExportRequest({
        transcriptId: '33333333-3333-3333-3333-333333333333',
        fileColumn: 'msdyn_voicetranscript_formatted',
        contentColumn: 'msdyn_voicetranscript'
      })
    ).toThrow(ServiceError);
  });
});

describe('buildRepresentativeAvailabilityRequest', () => {
  it('builds the documented active-conversation availability action request', () => {
    expect(
      buildRepresentativeAvailabilityRequest({
        availabilityMode: 'for_conversation',
        conversationId: ' 11111111-1111-1111-1111-111111111111 ',
        customContextItems: {
          Survey: {
            value: 'India',
            isDisplayable: true,
            datatype: '192350000'
          }
        }
      })
    ).toEqual({
      operationName: 'CCaaS_GetRepresentativeAvailabilityForConversation',
      requestBody: {
        ApiVersion: '1.0',
        ConversationId: '11111111-1111-1111-1111-111111111111',
        CustomContextItems:
          '{"Survey":{"value":"India","isDisplayable":true,"datatype":"192350000"}}'
      },
      request: {
        apiVersion: '1.0',
        conversationId: '11111111-1111-1111-1111-111111111111'
      }
    });
  });

  it('builds the documented before-conversation availability action request', () => {
    expect(
      buildRepresentativeAvailabilityRequest({
        availabilityMode: 'before_conversation',
        liveWorkStreamId: ' 22222222-2222-2222-2222-222222222222 ',
        apiVersion: ' 1.0 ',
        channelEngagementContextJson: '{"msdyn_browser":"Edge"}'
      })
    ).toEqual({
      operationName: 'CCaaS_GetRepresentativeAvailabilityBeforeConversation',
      requestBody: {
        ApiVersion: '1.0',
        LiveWorkStreamId: '22222222-2222-2222-2222-222222222222',
        ChannelEngagementContext: '{"msdyn_browser":"Edge"}'
      },
      request: {
        apiVersion: '1.0',
        liveWorkStreamId: '22222222-2222-2222-2222-222222222222'
      }
    });
  });

  it('rejects fields from the wrong availability mode with ServiceError', () => {
    expect(() =>
      buildRepresentativeAvailabilityRequest({
        availabilityMode: 'for_conversation',
        conversationId: '11111111-1111-1111-1111-111111111111',
        liveWorkStreamId: '22222222-2222-2222-2222-222222222222'
      })
    ).toThrow(ServiceError);

    expect(() =>
      buildRepresentativeAvailabilityRequest({
        availabilityMode: 'before_conversation',
        conversationId: '11111111-1111-1111-1111-111111111111',
        liveWorkStreamId: '22222222-2222-2222-2222-222222222222'
      })
    ).toThrow(ServiceError);
  });

  it('rejects invalid or conflicting JSON context inputs with ServiceError', () => {
    expect(() =>
      buildRepresentativeAvailabilityRequest({
        availabilityMode: 'before_conversation',
        liveWorkStreamId: '22222222-2222-2222-2222-222222222222',
        customContextItems: {},
        customContextItemsJson: '{}'
      })
    ).toThrow(ServiceError);

    expect(() =>
      buildRepresentativeAvailabilityRequest({
        availabilityMode: 'before_conversation',
        liveWorkStreamId: '22222222-2222-2222-2222-222222222222',
        channelEngagementContextJson: '{not json}'
      })
    ).toThrow(ServiceError);
  });
});
