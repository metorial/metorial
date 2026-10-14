import { Slate } from 'slates';
import { spec } from './spec';
import {
  createRoom,
  createTask,
  deleteMessage,
  editMessage,
  getContacts,
  getFiles,
  getFileUrl,
  getMessage,
  getMessages,
  getProfile,
  getRoom,
  getTask,
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
    getMessage,
    editMessage,
    deleteMessage,
    markMessages,
    createTask,
    getTasks,
    getTask,
    updateTaskStatus,
    getContacts,
    handleContactRequest,
    getFiles,
    getFileUrl
  ],
  triggers: []
});
