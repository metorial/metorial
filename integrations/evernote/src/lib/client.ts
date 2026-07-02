// Evernote API Client - communicates via Thrift Binary Protocol over HTTP
import { axios } from 'slates';
import { EvernoteError, evernoteApiError } from './errors';
import {
  readEDAMNotFoundException,
  readEDAMSystemException,
  readEDAMUserException,
  readNote,
  readNotebook,
  readNotesMetadataList,
  readResource,
  readSavedSearch,
  readSyncState,
  readTag,
  readUser,
  writeNote,
  writeNotebook,
  writeNoteFilter,
  writeNoteResultSpec,
  writeNotesMetadataResultSpec,
  writeSavedSearch,
  writeTag
} from './serializers';
import { ThriftReader, ThriftWriter, TMessageType, TType } from './thrift';
import type {
  EvernoteNote,
  EvernoteNotebook,
  EvernoteNoteFilter,
  EvernoteNoteResultSpec,
  EvernoteNotesMetadataList,
  EvernoteNotesMetadataResultSpec,
  EvernoteResource,
  EvernoteSavedSearch,
  EvernoteSyncState,
  EvernoteTag,
  EvernoteUser
} from './types';

// Evernote error codes
let EDAMErrorCode: Record<number, string> = {
  1: 'UNKNOWN',
  2: 'BAD_DATA_FORMAT',
  3: 'PERMISSION_DENIED',
  4: 'INTERNAL_ERROR',
  5: 'DATA_REQUIRED',
  6: 'LIMIT_REACHED',
  7: 'QUOTA_REACHED',
  8: 'INVALID_AUTH',
  9: 'AUTH_EXPIRED',
  10: 'DATA_CONFLICT',
  11: 'ENML_VALIDATION',
  12: 'SHARD_UNAVAILABLE',
  13: 'LEN_TOO_SHORT',
  14: 'LEN_TOO_LONG',
  15: 'TOO_FEW',
  16: 'TOO_MANY',
  17: 'UNSUPPORTED_OPERATION',
  18: 'TAKEN_DOWN',
  19: 'RATE_LIMIT_REACHED'
};

export class Client {
  private token: string;
  private noteStoreUrl: string;
  private seqId: number = 0;

  constructor(config: { token: string; noteStoreUrl: string }) {
    this.token = config.token;
    this.noteStoreUrl = config.noteStoreUrl;
  }

  private nextSeqId(): number {
    return ++this.seqId;
  }

  // Send a Thrift RPC call and parse the response
  private async callNoteStore(
    method: string,
    writeArgs: (w: ThriftWriter) => void
  ): Promise<ThriftReader> {
    let w = new ThriftWriter();
    w.writeMessageBegin(method, TMessageType.CALL, this.nextSeqId());
    w.writeStructBegin();

    // Field 1: authenticationToken (always first param)
    w.writeFieldBegin(TType.STRING, 1);
    w.writeString(this.token);

    // Write additional arguments
    writeArgs(w);

    w.writeFieldStop();
    w.writeStructEnd();

    let payload = w.toUint8Array();

    let response: any;
    try {
      response = await axios.post(this.noteStoreUrl, payload, {
        headers: {
          'Content-Type': 'application/x-thrift',
          Accept: 'application/x-thrift'
        },
        responseType: 'arraybuffer'
      });
    } catch (error) {
      throw evernoteApiError(error, `NoteStore.${method}`);
    }

    let responseData = new Uint8Array(response.data);
    let reader = new ThriftReader(responseData);
    let msg = reader.readMessageBegin();

    if (msg.type === TMessageType.EXCEPTION) {
      // Application-level Thrift exception
      let excFields: Record<number, any> = {};
      while (true) {
        let field = reader.readFieldBegin();
        if (field.type === TType.STOP) break;
        switch (field.id) {
          case 1:
            excFields[1] = reader.readString();
            break;
          case 2:
            excFields[2] = reader.readI32();
            break;
          default:
            reader.skip(field.type);
        }
      }
      throw new EvernoteError(
        excFields[1] || 'Thrift application exception',
        excFields[2] || 0
      );
    }

    // Read result struct - check for success (field 0) or exception fields
    return reader;
  }

  private async callUserStore(
    userStoreUrl: string,
    method: string,
    writeArgs: (w: ThriftWriter) => void
  ): Promise<ThriftReader> {
    let w = new ThriftWriter();
    w.writeMessageBegin(method, TMessageType.CALL, this.nextSeqId());
    w.writeStructBegin();

    w.writeFieldBegin(TType.STRING, 1);
    w.writeString(this.token);

    writeArgs(w);

    w.writeFieldStop();
    w.writeStructEnd();

    let payload = w.toUint8Array();

    let response: any;
    try {
      response = await axios.post(userStoreUrl, payload, {
        headers: {
          'Content-Type': 'application/x-thrift',
          Accept: 'application/x-thrift'
        },
        responseType: 'arraybuffer'
      });
    } catch (error) {
      throw evernoteApiError(error, `UserStore.${method}`);
    }

    let responseData = new Uint8Array(response.data);
    let reader = new ThriftReader(responseData);
    let msg = reader.readMessageBegin();

    if (msg.type === TMessageType.EXCEPTION) {
      let excFields: Record<number, any> = {};
      while (true) {
        let field = reader.readFieldBegin();
        if (field.type === TType.STOP) break;
        switch (field.id) {
          case 1:
            excFields[1] = reader.readString();
            break;
          case 2:
            excFields[2] = reader.readI32();
            break;
          default:
            reader.skip(field.type);
        }
      }
      throw new EvernoteError(
        excFields[1] || 'Thrift application exception',
        excFields[2] || 0
      );
    }

    return reader;
  }

  // Parse the response struct, handling success (field 0) and exception fields
  private parseResultStruct<T>(reader: ThriftReader, readSuccess: (r: ThriftReader) => T): T {
    while (true) {
      let field = reader.readFieldBegin();
      if (field.type === TType.STOP) break;

      switch (field.id) {
        case 0:
          // Success result
          return readSuccess(reader);
        case 1: {
          // EDAMUserException
          let exc = readEDAMUserException(reader);
          let codeName = EDAMErrorCode[exc.errorCode] || 'UNKNOWN';
          throw new EvernoteError(
            `Evernote API error: ${codeName}${exc.parameter ? ` (${exc.parameter})` : ''}`,
            exc.errorCode,
            exc.parameter
          );
        }
        case 2: {
          // EDAMSystemException
          let exc = readEDAMSystemException(reader);
          let codeName = EDAMErrorCode[exc.errorCode] || 'UNKNOWN';
          throw new EvernoteError(
            exc.message || `Evernote system error: ${codeName}`,
            exc.errorCode,
            undefined,
            exc.rateLimitDuration
          );
        }
        case 3: {
          // EDAMNotFoundException
          let exc = readEDAMNotFoundException(reader);
          throw new EvernoteError(
            `Not found: ${exc.identifier || 'unknown'}${exc.key ? ` (key: ${exc.key})` : ''}`,
            0,
            exc.identifier
          );
        }
        default:
          reader.skip(field.type);
      }
    }

    throw new EvernoteError('No result returned from Evernote API', 0);
  }

  // Parse a void result (only check for exceptions)
  private parseVoidResult(reader: ThriftReader): void {
    while (true) {
      let field = reader.readFieldBegin();
      if (field.type === TType.STOP) break;

      switch (field.id) {
        case 1: {
          let exc = readEDAMUserException(reader);
          let codeName = EDAMErrorCode[exc.errorCode] || 'UNKNOWN';
          throw new EvernoteError(
            `Evernote API error: ${codeName}${exc.parameter ? ` (${exc.parameter})` : ''}`,
            exc.errorCode,
            exc.parameter
          );
        }
        case 2: {
          let exc = readEDAMSystemException(reader);
          let codeName = EDAMErrorCode[exc.errorCode] || 'UNKNOWN';
          throw new EvernoteError(
            exc.message || `Evernote system error: ${codeName}`,
            exc.errorCode,
            undefined,
            exc.rateLimitDuration
          );
        }
        case 3: {
          let exc = readEDAMNotFoundException(reader);
          throw new EvernoteError(
            `Not found: ${exc.identifier || 'unknown'}`,
            0,
            exc.identifier
          );
        }
        default:
          reader.skip(field.type);
      }
    }
  }

  // Parse an i32 result
  private parseI32Result(reader: ThriftReader): number {
    return this.parseResultStruct(reader, r => r.readI32());
  }

  // --- NoteStore Methods ---

  async listNotebooks(): Promise<EvernoteNotebook[]> {
    let reader = await this.callNoteStore('listNotebooks', () => {});
    return this.parseResultStruct(reader, r => {
      let list = r.readListBegin();
      let notebooks: EvernoteNotebook[] = [];
      for (let i = 0; i < list.size; i++) {
        notebooks.push(readNotebook(r));
      }
      return notebooks;
    });
  }

  async getNotebook(notebookGuid: string): Promise<EvernoteNotebook> {
    let reader = await this.callNoteStore('getNotebook', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(notebookGuid);
    });
    return this.parseResultStruct(reader, readNotebook);
  }

  async getDefaultNotebook(): Promise<EvernoteNotebook> {
    let reader = await this.callNoteStore('getDefaultNotebook', () => {});
    return this.parseResultStruct(reader, readNotebook);
  }

  async createNotebook(notebook: EvernoteNotebook): Promise<EvernoteNotebook> {
    let reader = await this.callNoteStore('createNotebook', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeNotebook(w, notebook);
    });
    return this.parseResultStruct(reader, readNotebook);
  }

  async updateNotebook(notebook: EvernoteNotebook): Promise<number> {
    let reader = await this.callNoteStore('updateNotebook', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeNotebook(w, notebook);
    });
    return this.parseI32Result(reader);
  }

  async createNote(note: EvernoteNote): Promise<EvernoteNote> {
    let reader = await this.callNoteStore('createNote', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeNote(w, note);
    });
    return this.parseResultStruct(reader, readNote);
  }

  async updateNote(note: EvernoteNote): Promise<EvernoteNote> {
    let reader = await this.callNoteStore('updateNote', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeNote(w, note);
    });
    return this.parseResultStruct(reader, readNote);
  }

  async deleteNote(noteGuid: string): Promise<number> {
    let reader = await this.callNoteStore('deleteNote', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(noteGuid);
    });
    return this.parseI32Result(reader);
  }

  async getNote(
    noteGuid: string,
    withContent: boolean,
    withResourcesData: boolean,
    withResourcesRecognition: boolean,
    withResourcesAlternateData: boolean
  ): Promise<EvernoteNote> {
    return await this.getNoteWithResultSpec(noteGuid, {
      includeContent: withContent,
      includeResourcesData: withResourcesData,
      includeResourcesRecognition: withResourcesRecognition,
      includeResourcesAlternateData: withResourcesAlternateData
    });
  }

  async getNoteWithResultSpec(
    noteGuid: string,
    resultSpec: EvernoteNoteResultSpec
  ): Promise<EvernoteNote> {
    let reader = await this.callNoteStore('getNoteWithResultSpec', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(noteGuid);
      w.writeFieldBegin(TType.STRUCT, 3);
      writeNoteResultSpec(w, resultSpec);
    });
    return this.parseResultStruct(reader, readNote);
  }

  async getNoteContent(noteGuid: string): Promise<string> {
    let reader = await this.callNoteStore('getNoteContent', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(noteGuid);
    });
    return this.parseResultStruct(reader, r => r.readString());
  }

  async findNotesMetadata(
    filter: EvernoteNoteFilter,
    offset: number,
    maxNotes: number,
    resultSpec: EvernoteNotesMetadataResultSpec
  ): Promise<EvernoteNotesMetadataList> {
    let reader = await this.callNoteStore('findNotesMetadata', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeNoteFilter(w, filter);
      w.writeFieldBegin(TType.I32, 3);
      w.writeI32(offset);
      w.writeFieldBegin(TType.I32, 4);
      w.writeI32(maxNotes);
      w.writeFieldBegin(TType.STRUCT, 5);
      writeNotesMetadataResultSpec(w, resultSpec);
    });
    return this.parseResultStruct(reader, readNotesMetadataList);
  }

  async getNoteTagNames(noteGuid: string): Promise<string[]> {
    let reader = await this.callNoteStore('getNoteTagNames', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(noteGuid);
    });
    return this.parseResultStruct(reader, r => {
      let list = r.readListBegin();
      let names: string[] = [];
      for (let i = 0; i < list.size; i++) {
        names.push(r.readString());
      }
      return names;
    });
  }

  async getResource(
    resourceGuid: string,
    withData = false,
    withRecognition = false,
    withAlternateData = false
  ): Promise<EvernoteResource> {
    let reader = await this.callNoteStore('getResource', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(resourceGuid);
      w.writeFieldBegin(TType.BOOL, 3);
      w.writeBool(withData);
      w.writeFieldBegin(TType.BOOL, 4);
      w.writeBool(withRecognition);
      w.writeFieldBegin(TType.BOOL, 5);
      w.writeBool(withAlternateData);
    });
    return this.parseResultStruct(reader, readResource);
  }

  async getResourceData(resourceGuid: string): Promise<Uint8Array> {
    let reader = await this.callNoteStore('getResourceData', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(resourceGuid);
    });
    return this.parseResultStruct(reader, r => r.readBinary());
  }

  async listTags(): Promise<EvernoteTag[]> {
    let reader = await this.callNoteStore('listTags', () => {});
    return this.parseResultStruct(reader, r => {
      let list = r.readListBegin();
      let tags: EvernoteTag[] = [];
      for (let i = 0; i < list.size; i++) {
        tags.push(readTag(r));
      }
      return tags;
    });
  }

  async listTagsByNotebook(notebookGuid: string): Promise<EvernoteTag[]> {
    let reader = await this.callNoteStore('listTagsByNotebook', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(notebookGuid);
    });
    return this.parseResultStruct(reader, r => {
      let list = r.readListBegin();
      let tags: EvernoteTag[] = [];
      for (let i = 0; i < list.size; i++) {
        tags.push(readTag(r));
      }
      return tags;
    });
  }

  async getTag(tagGuid: string): Promise<EvernoteTag> {
    let reader = await this.callNoteStore('getTag', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(tagGuid);
    });
    return this.parseResultStruct(reader, readTag);
  }

  async createTag(tag: EvernoteTag): Promise<EvernoteTag> {
    let reader = await this.callNoteStore('createTag', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeTag(w, tag);
    });
    return this.parseResultStruct(reader, readTag);
  }

  async updateTag(tag: EvernoteTag): Promise<number> {
    let reader = await this.callNoteStore('updateTag', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeTag(w, tag);
    });
    return this.parseI32Result(reader);
  }

  async untagAll(tagGuid: string): Promise<void> {
    let reader = await this.callNoteStore('untagAll', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(tagGuid);
    });
    this.parseVoidResult(reader);
  }

  async listSearches(): Promise<EvernoteSavedSearch[]> {
    let reader = await this.callNoteStore('listSearches', () => {});
    return this.parseResultStruct(reader, r => {
      let list = r.readListBegin();
      let searches: EvernoteSavedSearch[] = [];
      for (let i = 0; i < list.size; i++) {
        searches.push(readSavedSearch(r));
      }
      return searches;
    });
  }

  async createSearch(search: EvernoteSavedSearch): Promise<EvernoteSavedSearch> {
    let reader = await this.callNoteStore('createSearch', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeSavedSearch(w, search);
    });
    return this.parseResultStruct(reader, readSavedSearch);
  }

  async updateSearch(search: EvernoteSavedSearch): Promise<number> {
    let reader = await this.callNoteStore('updateSearch', w => {
      w.writeFieldBegin(TType.STRUCT, 2);
      writeSavedSearch(w, search);
    });
    return this.parseI32Result(reader);
  }

  async getSyncState(): Promise<EvernoteSyncState> {
    let reader = await this.callNoteStore('getSyncState', () => {});
    return this.parseResultStruct(reader, readSyncState);
  }

  async copyNote(noteGuid: string, toNotebookGuid: string): Promise<EvernoteNote> {
    let reader = await this.callNoteStore('copyNote', w => {
      w.writeFieldBegin(TType.STRING, 2);
      w.writeString(noteGuid);
      w.writeFieldBegin(TType.STRING, 3);
      w.writeString(toNotebookGuid);
    });
    return this.parseResultStruct(reader, readNote);
  }

  // --- UserStore Methods ---

  async getUser(baseUrl: string): Promise<EvernoteUser> {
    let userStoreUrl = `${baseUrl}/edam/user`;
    let reader = await this.callUserStore(userStoreUrl, 'getUser', () => {});
    return this.parseResultStruct(reader, readUser);
  }
}
