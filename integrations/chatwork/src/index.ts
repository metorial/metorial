import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRoom,
  createTask,
  deleteMessage,
  editMessage,
  getContacts,
  getFiles,
  getMessages,
  getProfile,
  getRoom,
  getTasks,
  handleContactRequest,
  leaveOrDeleteRoom,
  listRooms,
  manageRoomMembers,
  markMessages,
  sendMessage,
  updateRoom,
  updateTaskStatus
} from './tools';
import { messageEvent } from './triggers';

export let provider = Slate.create({
  spec,
  tools: [
    getProfile,
    listRooms,
    getRoom,
    createRoom,
    updateRoom,
    leaveOrDeleteRoom,
    manageRoomMembers,
    sendMessage,
    getMessages,
    editMessage,
    deleteMessage,
    markMessages,
    createTask,
    getTasks,
    updateTaskStatus,
    getContacts,
    handleContactRequest,
    getFiles
  ],
  triggers: [messageEvent]
});
