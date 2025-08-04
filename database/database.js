// database/database.js
const fsExtra = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

class Database {
  constructor() {
    this.dbPath = path.join(__dirname, '..', 'data', 'database.json');
    this.init();
  }

  async init() {
    // Ensure data directory exists
    await fsExtra.ensureDir(path.dirname(this.dbPath));
    
    // Initialize database if it doesn't exist
    if (!await fsExtra.pathExists(this.dbPath)) {
      const initialData = {
        users: [],
        groups: {
          general: {
            id: 'general',
            name: 'General',
            description: 'General discussion for everyone',
            members: [],
            messages: [],
            createdBy: 'system',
            createdAt: new Date().toISOString(),
            isPrivate: false
          }
        },
        calls: [],
        files: []
      };
      
      await this.writeDB(initialData);
      console.log('✅ Database initialized');
    }
  }

  async readDB() {
    try {
      const data = await fsExtra.readJson(this.dbPath);
      return data;
    } catch (error) {
      console.error('Error reading database:', error);
      return null;
    }
  }

  async writeDB(data) {
    try {
      await fsExtra.writeJson(this.dbPath, data, { spaces: 2 });
      return true;
    } catch (error) {
      console.error('Error writing database:', error);
      return false;
    }
  }

  // User methods
  async createUser(username) {
    const data = await this.readDB();
    if (!data) return null;

    const existingUser = data.users.find(u => u.username === username);
    if (existingUser) {
      existingUser.isOnline = true;
      existingUser.lastSeen = new Date().toISOString();
      await this.writeDB(data);
      return existingUser;
    }

    const user = {
      id: uuidv4(),
      username,
      isOnline: true,
      lastSeen: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    data.users.push(user);
    await this.writeDB(data);
    return user;
  }

  async updateUserStatus(userId, isOnline) {
    const data = await this.readDB();
    if (!data) return false;

    const user = data.users.find(u => u.id === userId);
    if (user) {
      user.isOnline = isOnline;
      user.lastSeen = new Date().toISOString();
      await this.writeDB(data);
      return true;
    }
    return false;
  }

  async getOnlineUsers() {
    const data = await this.readDB();
    if (!data) return [];
    return data.users.filter(user => user.isOnline);
  }

  // Group methods
  async createGroup(name, createdBy, description = '', isPrivate = false) {
    const data = await this.readDB();
    if (!data) return null;

    const groupId = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    const group = {
      id: groupId,
      name,
      description,
      members: [createdBy],
      messages: [],
      createdBy,
      createdAt: new Date().toISOString(),
      isPrivate
    };

    data.groups[groupId] = group;
    await this.writeDB(data);
    return group;
  }

  async getGroups() {
    const data = await this.readDB();
    return data ? data.groups : {};
  }

  async joinGroup(groupId, userId) {
    const data = await this.readDB();
    if (!data || !data.groups[groupId]) return false;

    const group = data.groups[groupId];
    if (!group.members.includes(userId)) {
      group.members.push(userId);
      await this.writeDB(data);
      return true;
    }
    return false;
  }

  // Message methods
  async addMessage(messageData) {
    const data = await this.readDB();
    if (!data || !data.groups[messageData.groupId]) return null;

    const message = {
      id: uuidv4(),
      ...messageData,
      timestamp: new Date().toISOString(),
      isEncrypted: false,
      viewedBy: []
    };

    data.groups[messageData.groupId].messages.push(message);
    await this.writeDB(data);
    return message;
  }

  async encryptMessage(messageId, groupId) {
    const data = await this.readDB();
    if (!data || !data.groups[groupId]) return false;

    const group = data.groups[groupId];
    const message = group.messages.find(m => m.id === messageId);
    
    if (message && !message.isEncrypted) {
      message.text = this.generateEncryptedText(message.text.length);
      message.isEncrypted = true;
      message.encryptedAt = new Date().toISOString();
      await this.writeDB(data);
      return true;
    }
    return false;
  }

  generateEncryptedText(length) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  // Call methods
  async createCall(type, groupId, initiator) {
    const data = await this.readDB();
    if (!data) return null;

    const call = {
      id: uuidv4(),
      type,
      groupId,
      initiator,
      participants: [initiator],
      status: 'pending',
      startedAt: new Date().toISOString()
    };

    data.calls.push(call);
    await this.writeDB(data);
    return call;
  }

  async updateCallStatus(callId, status) {
    const data = await this.readDB();
    if (!data) return false;

    const call = data.calls.find(c => c.id === callId);
    if (call) {
      call.status = status;
      if (status === 'ended') {
        call.endedAt = new Date().toISOString();
      }
      await this.writeDB(data);
      return true;
    }
    return false;
  }

  // File methods
  async saveFileInfo(fileInfo) {
    const data = await this.readDB();
    if (!data) return null;

    const file = {
      id: uuidv4(),
      ...fileInfo,
      uploadedAt: new Date().toISOString()
    };

    data.files.push(file);
    await this.writeDB(data);
    return file;
  }
}

module.exports = new Database();
