// Serializers and deserializers for Evernote Thrift types

import { type ThriftReader, type ThriftWriter, TType } from './thrift';
import type {
  EvernoteData,
  EvernoteNote,
  EvernoteNoteAttributes,
  EvernoteNotebook,
  EvernoteNoteFilter,
  EvernoteNoteMetadata,
  EvernoteNoteResultSpec,
  EvernoteNotesMetadataList,
  EvernoteNotesMetadataResultSpec,
  EvernoteResource,
  EvernoteResourceAttributes,
  EvernoteSavedSearch,
  EvernoteSyncState,
  EvernoteTag,
  EvernoteUser
} from './types';

// -- Writers --

export let writeNoteFilter = (w: ThriftWriter, filter: EvernoteNoteFilter) => {
  w.writeStructBegin();
  if (filter.order !== undefined) {
    w.writeFieldBegin(TType.I32, 1);
    w.writeI32(filter.order);
  }
  if (filter.ascending !== undefined) {
    w.writeFieldBegin(TType.BOOL, 2);
    w.writeBool(filter.ascending);
  }
  if (filter.words !== undefined) {
    w.writeFieldBegin(TType.STRING, 3);
    w.writeString(filter.words);
  }
  if (filter.notebookGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 4);
    w.writeString(filter.notebookGuid);
  }
  if (filter.tagGuids !== undefined) {
    w.writeFieldBegin(TType.LIST, 5);
    w.writeListBegin(TType.STRING, filter.tagGuids.length);
    for (let guid of filter.tagGuids) {
      w.writeString(guid);
    }
  }
  if (filter.timeZone !== undefined) {
    w.writeFieldBegin(TType.STRING, 6);
    w.writeString(filter.timeZone);
  }
  if (filter.inactive !== undefined) {
    w.writeFieldBegin(TType.BOOL, 7);
    w.writeBool(filter.inactive);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeNotesMetadataResultSpec = (
  w: ThriftWriter,
  spec: EvernoteNotesMetadataResultSpec
) => {
  w.writeStructBegin();
  if (spec.includeTitle !== undefined) {
    w.writeFieldBegin(TType.BOOL, 2);
    w.writeBool(spec.includeTitle);
  }
  if (spec.includeContentLength !== undefined) {
    w.writeFieldBegin(TType.BOOL, 5);
    w.writeBool(spec.includeContentLength);
  }
  if (spec.includeCreated !== undefined) {
    w.writeFieldBegin(TType.BOOL, 6);
    w.writeBool(spec.includeCreated);
  }
  if (spec.includeUpdated !== undefined) {
    w.writeFieldBegin(TType.BOOL, 7);
    w.writeBool(spec.includeUpdated);
  }
  if (spec.includeDeleted !== undefined) {
    w.writeFieldBegin(TType.BOOL, 8);
    w.writeBool(spec.includeDeleted);
  }
  if (spec.includeUpdateSequenceNum !== undefined) {
    w.writeFieldBegin(TType.BOOL, 10);
    w.writeBool(spec.includeUpdateSequenceNum);
  }
  if (spec.includeNotebookGuid !== undefined) {
    w.writeFieldBegin(TType.BOOL, 11);
    w.writeBool(spec.includeNotebookGuid);
  }
  if (spec.includeTagGuids !== undefined) {
    w.writeFieldBegin(TType.BOOL, 12);
    w.writeBool(spec.includeTagGuids);
  }
  if (spec.includeAttributes !== undefined) {
    w.writeFieldBegin(TType.BOOL, 14);
    w.writeBool(spec.includeAttributes);
  }
  if (spec.includeLargestResourceMime !== undefined) {
    w.writeFieldBegin(TType.BOOL, 20);
    w.writeBool(spec.includeLargestResourceMime);
  }
  if (spec.includeLargestResourceSize !== undefined) {
    w.writeFieldBegin(TType.BOOL, 21);
    w.writeBool(spec.includeLargestResourceSize);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeNoteResultSpec = (w: ThriftWriter, spec: EvernoteNoteResultSpec) => {
  w.writeStructBegin();
  if (spec.includeContent !== undefined) {
    w.writeFieldBegin(TType.BOOL, 1);
    w.writeBool(spec.includeContent);
  }
  if (spec.includeResourcesData !== undefined) {
    w.writeFieldBegin(TType.BOOL, 2);
    w.writeBool(spec.includeResourcesData);
  }
  if (spec.includeResourcesRecognition !== undefined) {
    w.writeFieldBegin(TType.BOOL, 3);
    w.writeBool(spec.includeResourcesRecognition);
  }
  if (spec.includeResourcesAlternateData !== undefined) {
    w.writeFieldBegin(TType.BOOL, 4);
    w.writeBool(spec.includeResourcesAlternateData);
  }
  if (spec.includeSharedNotes !== undefined) {
    w.writeFieldBegin(TType.BOOL, 5);
    w.writeBool(spec.includeSharedNotes);
  }
  if (spec.includeNoteAppDataValues !== undefined) {
    w.writeFieldBegin(TType.BOOL, 6);
    w.writeBool(spec.includeNoteAppDataValues);
  }
  if (spec.includeResourceAppDataValues !== undefined) {
    w.writeFieldBegin(TType.BOOL, 7);
    w.writeBool(spec.includeResourceAppDataValues);
  }
  if (spec.includeAccountLimits !== undefined) {
    w.writeFieldBegin(TType.BOOL, 8);
    w.writeBool(spec.includeAccountLimits);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeNoteAttributes = (w: ThriftWriter, attrs: EvernoteNoteAttributes) => {
  w.writeStructBegin();
  if (attrs.subjectDate !== undefined) {
    w.writeFieldBegin(TType.I64, 1);
    w.writeI64(attrs.subjectDate);
  }
  if (attrs.latitude !== undefined) {
    w.writeFieldBegin(TType.DOUBLE, 10);
    // Write double manually
    let buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, attrs.latitude);
    let bytes = new Uint8Array(buf);
    for (let b of bytes) w.writeByte(b);
  }
  if (attrs.longitude !== undefined) {
    w.writeFieldBegin(TType.DOUBLE, 11);
    let buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, attrs.longitude);
    let bytes = new Uint8Array(buf);
    for (let b of bytes) w.writeByte(b);
  }
  if (attrs.altitude !== undefined) {
    w.writeFieldBegin(TType.DOUBLE, 12);
    let buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, attrs.altitude);
    let bytes = new Uint8Array(buf);
    for (let b of bytes) w.writeByte(b);
  }
  if (attrs.author !== undefined) {
    w.writeFieldBegin(TType.STRING, 13);
    w.writeString(attrs.author);
  }
  if (attrs.source !== undefined) {
    w.writeFieldBegin(TType.STRING, 14);
    w.writeString(attrs.source);
  }
  if (attrs.sourceUrl !== undefined) {
    w.writeFieldBegin(TType.STRING, 15);
    w.writeString(attrs.sourceUrl);
  }
  if (attrs.sourceApplication !== undefined) {
    w.writeFieldBegin(TType.STRING, 16);
    w.writeString(attrs.sourceApplication);
  }
  if (attrs.shareDate !== undefined) {
    w.writeFieldBegin(TType.I64, 17);
    w.writeI64(attrs.shareDate);
  }
  if (attrs.reminderOrder !== undefined) {
    w.writeFieldBegin(TType.I64, 18);
    w.writeI64(attrs.reminderOrder);
  }
  if (attrs.reminderDoneTime !== undefined) {
    w.writeFieldBegin(TType.I64, 19);
    w.writeI64(attrs.reminderDoneTime);
  }
  if (attrs.reminderTime !== undefined) {
    w.writeFieldBegin(TType.I64, 20);
    w.writeI64(attrs.reminderTime);
  }
  if (attrs.placeName !== undefined) {
    w.writeFieldBegin(TType.STRING, 21);
    w.writeString(attrs.placeName);
  }
  if (attrs.contentClass !== undefined) {
    w.writeFieldBegin(TType.STRING, 22);
    w.writeString(attrs.contentClass);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeResourceAttributes = (w: ThriftWriter, attrs: EvernoteResourceAttributes) => {
  w.writeStructBegin();
  if (attrs.sourceUrl !== undefined) {
    w.writeFieldBegin(TType.STRING, 1);
    w.writeString(attrs.sourceUrl);
  }
  if (attrs.timestamp !== undefined) {
    w.writeFieldBegin(TType.I64, 2);
    w.writeI64(attrs.timestamp);
  }
  if (attrs.latitude !== undefined) {
    w.writeFieldBegin(TType.DOUBLE, 3);
    let buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, attrs.latitude);
    let bytes = new Uint8Array(buf);
    for (let b of bytes) w.writeByte(b);
  }
  if (attrs.longitude !== undefined) {
    w.writeFieldBegin(TType.DOUBLE, 4);
    let buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, attrs.longitude);
    let bytes = new Uint8Array(buf);
    for (let b of bytes) w.writeByte(b);
  }
  if (attrs.altitude !== undefined) {
    w.writeFieldBegin(TType.DOUBLE, 5);
    let buf = new ArrayBuffer(8);
    new DataView(buf).setFloat64(0, attrs.altitude);
    let bytes = new Uint8Array(buf);
    for (let b of bytes) w.writeByte(b);
  }
  if (attrs.cameraMake !== undefined) {
    w.writeFieldBegin(TType.STRING, 6);
    w.writeString(attrs.cameraMake);
  }
  if (attrs.cameraModel !== undefined) {
    w.writeFieldBegin(TType.STRING, 7);
    w.writeString(attrs.cameraModel);
  }
  if (attrs.fileName !== undefined) {
    w.writeFieldBegin(TType.STRING, 10);
    w.writeString(attrs.fileName);
  }
  if (attrs.attachment !== undefined) {
    w.writeFieldBegin(TType.BOOL, 11);
    w.writeBool(attrs.attachment);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeData = (w: ThriftWriter, data: EvernoteData) => {
  w.writeStructBegin();
  if (data.bodyHash !== undefined) {
    w.writeFieldBegin(TType.STRING, 1);
    w.writeBinary(data.bodyHash);
  }
  if (data.size !== undefined) {
    w.writeFieldBegin(TType.I32, 2);
    w.writeI32(data.size);
  }
  if (data.body !== undefined) {
    w.writeFieldBegin(TType.STRING, 3);
    w.writeBinary(data.body);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeResource = (w: ThriftWriter, resource: EvernoteResource) => {
  w.writeStructBegin();
  if (resource.resourceGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 1);
    w.writeString(resource.resourceGuid);
  }
  if (resource.noteGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 2);
    w.writeString(resource.noteGuid);
  }
  if (resource.data !== undefined) {
    w.writeFieldBegin(TType.STRUCT, 3);
    writeData(w, resource.data);
  }
  if (resource.mime !== undefined) {
    w.writeFieldBegin(TType.STRING, 4);
    w.writeString(resource.mime);
  }
  if (resource.width !== undefined) {
    w.writeFieldBegin(TType.I16, 5);
    w.writeI16(resource.width);
  }
  if (resource.height !== undefined) {
    w.writeFieldBegin(TType.I16, 6);
    w.writeI16(resource.height);
  }
  if (resource.active !== undefined) {
    w.writeFieldBegin(TType.BOOL, 8);
    w.writeBool(resource.active);
  }
  if (resource.attributes !== undefined) {
    w.writeFieldBegin(TType.STRUCT, 11);
    writeResourceAttributes(w, resource.attributes);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeNote = (w: ThriftWriter, note: EvernoteNote) => {
  w.writeStructBegin();
  if (note.noteGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 1);
    w.writeString(note.noteGuid);
  }
  if (note.title !== undefined) {
    w.writeFieldBegin(TType.STRING, 2);
    w.writeString(note.title);
  }
  if (note.content !== undefined) {
    w.writeFieldBegin(TType.STRING, 3);
    w.writeString(note.content);
  }
  if (note.created !== undefined) {
    w.writeFieldBegin(TType.I64, 5);
    w.writeI64(note.created);
  }
  if (note.updated !== undefined) {
    w.writeFieldBegin(TType.I64, 6);
    w.writeI64(note.updated);
  }
  if (note.deleted !== undefined) {
    w.writeFieldBegin(TType.I64, 7);
    w.writeI64(note.deleted);
  }
  if (note.active !== undefined) {
    w.writeFieldBegin(TType.BOOL, 8);
    w.writeBool(note.active);
  }
  if (note.notebookGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 10);
    w.writeString(note.notebookGuid);
  }
  if (note.tagGuids !== undefined) {
    w.writeFieldBegin(TType.LIST, 11);
    w.writeListBegin(TType.STRING, note.tagGuids.length);
    for (let guid of note.tagGuids) {
      w.writeString(guid);
    }
  }
  if (note.resources !== undefined) {
    w.writeFieldBegin(TType.LIST, 12);
    w.writeListBegin(TType.STRUCT, note.resources.length);
    for (let resource of note.resources) {
      writeResource(w, resource);
    }
  }
  if (note.attributes !== undefined) {
    w.writeFieldBegin(TType.STRUCT, 13);
    writeNoteAttributes(w, note.attributes);
  }
  if (note.tagNames !== undefined) {
    w.writeFieldBegin(TType.LIST, 14);
    w.writeListBegin(TType.STRING, note.tagNames.length);
    for (let name of note.tagNames) {
      w.writeString(name);
    }
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeNotebook = (w: ThriftWriter, notebook: EvernoteNotebook) => {
  w.writeStructBegin();
  if (notebook.notebookGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 1);
    w.writeString(notebook.notebookGuid);
  }
  if (notebook.name !== undefined) {
    w.writeFieldBegin(TType.STRING, 2);
    w.writeString(notebook.name);
  }
  if (notebook.defaultNotebook !== undefined) {
    w.writeFieldBegin(TType.BOOL, 5);
    w.writeBool(notebook.defaultNotebook);
  }
  if (notebook.stack !== undefined) {
    w.writeFieldBegin(TType.STRING, 10);
    w.writeString(notebook.stack);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeTag = (w: ThriftWriter, tag: EvernoteTag) => {
  w.writeStructBegin();
  if (tag.tagGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 1);
    w.writeString(tag.tagGuid);
  }
  if (tag.name !== undefined) {
    w.writeFieldBegin(TType.STRING, 2);
    w.writeString(tag.name);
  }
  if (tag.parentGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 3);
    w.writeString(tag.parentGuid);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

export let writeSavedSearch = (w: ThriftWriter, search: EvernoteSavedSearch) => {
  w.writeStructBegin();
  if (search.searchGuid !== undefined) {
    w.writeFieldBegin(TType.STRING, 1);
    w.writeString(search.searchGuid);
  }
  if (search.name !== undefined) {
    w.writeFieldBegin(TType.STRING, 2);
    w.writeString(search.name);
  }
  if (search.query !== undefined) {
    w.writeFieldBegin(TType.STRING, 3);
    w.writeString(search.query);
  }
  if (search.format !== undefined) {
    w.writeFieldBegin(TType.I32, 4);
    w.writeI32(search.format);
  }
  w.writeFieldStop();
  w.writeStructEnd();
};

// -- Readers --

export let readNoteAttributes = (r: ThriftReader): EvernoteNoteAttributes => {
  let attrs: EvernoteNoteAttributes = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        attrs.subjectDate = r.readI64();
        break;
      case 10:
        attrs.latitude = r.readDouble();
        break;
      case 11:
        attrs.longitude = r.readDouble();
        break;
      case 12:
        attrs.altitude = r.readDouble();
        break;
      case 13:
        attrs.author = r.readString();
        break;
      case 14:
        attrs.source = r.readString();
        break;
      case 15:
        attrs.sourceUrl = r.readString();
        break;
      case 16:
        attrs.sourceApplication = r.readString();
        break;
      case 17:
        attrs.shareDate = r.readI64();
        break;
      case 18:
        attrs.reminderOrder = r.readI64();
        break;
      case 19:
        attrs.reminderDoneTime = r.readI64();
        break;
      case 20:
        attrs.reminderTime = r.readI64();
        break;
      case 21:
        attrs.placeName = r.readString();
        break;
      case 22:
        attrs.contentClass = r.readString();
        break;
      default:
        r.skip(field.type);
    }
  }
  return attrs;
};

export let readResourceAttributes = (r: ThriftReader): EvernoteResourceAttributes => {
  let attrs: EvernoteResourceAttributes = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        attrs.sourceUrl = r.readString();
        break;
      case 2:
        attrs.timestamp = r.readI64();
        break;
      case 3:
        attrs.latitude = r.readDouble();
        break;
      case 4:
        attrs.longitude = r.readDouble();
        break;
      case 5:
        attrs.altitude = r.readDouble();
        break;
      case 6:
        attrs.cameraMake = r.readString();
        break;
      case 7:
        attrs.cameraModel = r.readString();
        break;
      case 10:
        attrs.fileName = r.readString();
        break;
      case 11:
        attrs.attachment = r.readBool();
        break;
      default:
        r.skip(field.type);
    }
  }
  return attrs;
};

export let readData = (r: ThriftReader): EvernoteData => {
  let data: EvernoteData = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        data.bodyHash = r.readBinary();
        break;
      case 2:
        data.size = r.readI32();
        break;
      case 3:
        data.body = r.readBinary();
        break;
      default:
        r.skip(field.type);
    }
  }
  return data;
};

export let readResource = (r: ThriftReader): EvernoteResource => {
  let resource: EvernoteResource = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        resource.resourceGuid = r.readString();
        break;
      case 2:
        resource.noteGuid = r.readString();
        break;
      case 3:
        resource.data = readData(r);
        break;
      case 4:
        resource.mime = r.readString();
        break;
      case 5:
        resource.width = r.readI16();
        break;
      case 6:
        resource.height = r.readI16();
        break;
      case 8:
        resource.active = r.readBool();
        break;
      case 11:
        resource.attributes = readResourceAttributes(r);
        break;
      default:
        r.skip(field.type);
    }
  }
  return resource;
};

export let readNote = (r: ThriftReader): EvernoteNote => {
  let note: EvernoteNote = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        note.noteGuid = r.readString();
        break;
      case 2:
        note.title = r.readString();
        break;
      case 3:
        note.content = r.readString();
        break;
      case 4:
        note.contentHash = uint8ArrayToHex(r.readBinary());
        break;
      case 5:
        note.contentLength = r.readI32();
        break;
      case 6:
        note.created = r.readI64();
        break;
      case 7:
        note.updated = r.readI64();
        break;
      case 8:
        note.deleted = r.readI64();
        break;
      case 9:
        note.active = r.readBool();
        break;
      case 10:
        note.updateSequenceNum = r.readI32();
        break;
      case 11:
        note.notebookGuid = r.readString();
        break;
      case 12: {
        let list = r.readListBegin();
        note.tagGuids = [];
        for (let i = 0; i < list.size; i++) {
          note.tagGuids.push(r.readString());
        }
        break;
      }
      case 13: {
        let list = r.readListBegin();
        note.resources = [];
        for (let i = 0; i < list.size; i++) {
          note.resources.push(readResource(r));
        }
        break;
      }
      case 14:
        note.attributes = readNoteAttributes(r);
        break;
      case 15: {
        let list = r.readListBegin();
        note.tagNames = [];
        for (let i = 0; i < list.size; i++) {
          note.tagNames.push(r.readString());
        }
        break;
      }
      default:
        r.skip(field.type);
    }
  }
  return note;
};

export let readNotebook = (r: ThriftReader): EvernoteNotebook => {
  let notebook: EvernoteNotebook = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        notebook.notebookGuid = r.readString();
        break;
      case 2:
        notebook.name = r.readString();
        break;
      case 5:
        notebook.defaultNotebook = r.readBool();
        break;
      case 6:
        notebook.serviceCreated = r.readI64();
        break;
      case 7:
        notebook.serviceUpdated = r.readI64();
        break;
      case 8:
        notebook.updateSequenceNum = r.readI32();
        break;
      case 10:
        notebook.stack = r.readString();
        break;
      default:
        r.skip(field.type);
    }
  }
  return notebook;
};

export let readTag = (r: ThriftReader): EvernoteTag => {
  let tag: EvernoteTag = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        tag.tagGuid = r.readString();
        break;
      case 2:
        tag.name = r.readString();
        break;
      case 3:
        tag.parentGuid = r.readString();
        break;
      case 4:
        tag.updateSequenceNum = r.readI32();
        break;
      default:
        r.skip(field.type);
    }
  }
  return tag;
};

export let readSavedSearch = (r: ThriftReader): EvernoteSavedSearch => {
  let search: EvernoteSavedSearch = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        search.searchGuid = r.readString();
        break;
      case 2:
        search.name = r.readString();
        break;
      case 3:
        search.query = r.readString();
        break;
      case 4:
        search.format = r.readI32();
        break;
      case 5:
        search.updateSequenceNum = r.readI32();
        break;
      default:
        r.skip(field.type);
    }
  }
  return search;
};

export let readUser = (r: ThriftReader): EvernoteUser => {
  let user: EvernoteUser = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        user.userId = r.readI32();
        break;
      case 2:
        user.username = r.readString();
        break;
      case 3:
        user.email = r.readString();
        break;
      case 4:
        user.name = r.readString();
        break;
      case 6:
        user.timezone = r.readString();
        break;
      case 7:
        user.privilege = r.readI32();
        break;
      case 9:
        user.serviceLevel = r.readI32();
        break;
      case 10:
        user.created = r.readI64();
        break;
      case 11:
        user.updated = r.readI64();
        break;
      case 13:
        user.active = r.readBool();
        break;
      case 14:
        user.shardId = r.readString();
        break;
      case 16:
        user.photoUrl = r.readString();
        break;
      default:
        r.skip(field.type);
    }
  }
  return user;
};

export let readNoteMetadata = (r: ThriftReader): EvernoteNoteMetadata => {
  let meta: EvernoteNoteMetadata = { noteGuid: '' };
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        meta.noteGuid = r.readString();
        break;
      case 2:
        meta.title = r.readString();
        break;
      case 5:
        meta.contentLength = r.readI32();
        break;
      case 6:
        meta.created = r.readI64();
        break;
      case 7:
        meta.updated = r.readI64();
        break;
      case 8:
        meta.deleted = r.readI64();
        break;
      case 10:
        meta.updateSequenceNum = r.readI32();
        break;
      case 11:
        meta.notebookGuid = r.readString();
        break;
      case 12: {
        let list = r.readListBegin();
        meta.tagGuids = [];
        for (let i = 0; i < list.size; i++) {
          meta.tagGuids.push(r.readString());
        }
        break;
      }
      case 14:
        meta.attributes = readNoteAttributes(r);
        break;
      case 20:
        meta.largestResourceMime = r.readString();
        break;
      case 21:
        meta.largestResourceSize = r.readI32();
        break;
      default:
        r.skip(field.type);
    }
  }
  return meta;
};

export let readNotesMetadataList = (r: ThriftReader): EvernoteNotesMetadataList => {
  let result: EvernoteNotesMetadataList = { startIndex: 0, totalNotes: 0, notes: [] };
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        result.startIndex = r.readI32();
        break;
      case 2:
        result.totalNotes = r.readI32();
        break;
      case 3: {
        let list = r.readListBegin();
        result.notes = [];
        for (let i = 0; i < list.size; i++) {
          result.notes.push(readNoteMetadata(r));
        }
        break;
      }
      case 4: {
        let list = r.readListBegin();
        result.stoppedWords = [];
        for (let i = 0; i < list.size; i++) {
          result.stoppedWords.push(r.readString());
        }
        break;
      }
      case 5: {
        let list = r.readListBegin();
        result.searchedWords = [];
        for (let i = 0; i < list.size; i++) {
          result.searchedWords.push(r.readString());
        }
        break;
      }
      case 6:
        result.updateCount = r.readI32();
        break;
      default:
        r.skip(field.type);
    }
  }
  return result;
};

export let readSyncState = (r: ThriftReader): EvernoteSyncState => {
  let state: EvernoteSyncState = {
    currentTime: 0,
    fullSyncBefore: 0,
    updateCount: 0,
    uploaded: 0
  };
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        state.currentTime = r.readI64();
        break;
      case 2:
        state.fullSyncBefore = r.readI64();
        break;
      case 3:
        state.updateCount = r.readI32();
        break;
      case 4:
        state.uploaded = r.readI64();
        break;
      default:
        r.skip(field.type);
    }
  }
  return state;
};

// Utility: read a Thrift exception (EDAMUserException, EDAMSystemException, EDAMNotFoundException)
export let readEDAMUserException = (
  r: ThriftReader
): { errorCode: number; parameter?: string } => {
  let exc: { errorCode: number; parameter?: string } = { errorCode: 0 };
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        exc.errorCode = r.readI32();
        break;
      case 2:
        exc.parameter = r.readString();
        break;
      default:
        r.skip(field.type);
    }
  }
  return exc;
};

export let readEDAMSystemException = (
  r: ThriftReader
): { errorCode: number; message?: string; rateLimitDuration?: number } => {
  let exc: { errorCode: number; message?: string; rateLimitDuration?: number } = {
    errorCode: 0
  };
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        exc.errorCode = r.readI32();
        break;
      case 2:
        exc.message = r.readString();
        break;
      case 3:
        exc.rateLimitDuration = r.readI32();
        break;
      default:
        r.skip(field.type);
    }
  }
  return exc;
};

export let readEDAMNotFoundException = (
  r: ThriftReader
): { identifier?: string; key?: string } => {
  let exc: { identifier?: string; key?: string } = {};
  while (true) {
    let field = r.readFieldBegin();
    if (field.type === TType.STOP) break;
    switch (field.id) {
      case 1:
        exc.identifier = r.readString();
        break;
      case 2:
        exc.key = r.readString();
        break;
      default:
        r.skip(field.type);
    }
  }
  return exc;
};

// Helper: convert Uint8Array to hex string
let uint8ArrayToHex = (arr: Uint8Array): string => {
  let hex = '';
  for (let i = 0; i < arr.length; i++) {
    hex += arr[i]!.toString(16).padStart(2, '0');
  }
  return hex;
};
