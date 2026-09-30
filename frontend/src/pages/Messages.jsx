import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { messagesAPI } from '../api';
import { useAuth } from '../contexts/AuthContext';
import PageWrapper from '../components/PageWrapper';
import LoadingSpinner from '../components/LoadingSpinner';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function Messages() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState(null);
  const [content, setContent] = useState('');
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef(null);
  const pollingRef = useRef(null);

  const queryUserId = searchParams.get('userId');

  // Scroll to bottom when messages change
  const scrollToBottom = (behavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load contacts with search
  const loadContacts = async (query = '') => {
    try {
      setLoadingUsers(true);
      const res = await messagesAPI.getContacts({ search: query });
      const rawList = res.data?.data || [];

      const currentRoleSlug = (user?.role?.slug || (typeof user?.role === 'string' ? user?.role : '')).toLowerCase();
      const isIntern = currentRoleSlug === 'intern';

      // Interns contact HR, PMO, Admin.
      // Other roles (HR, PMO, Admin, Employee) can communicate with all active members including interns.
      const contactList = isIntern
        ? rawList.filter(u => {
            const slug = (u.role?.slug || '').toLowerCase();
            const name = (u.role?.name || '').toLowerCase();
            return (
              ['hr', 'hr-manager', 'pmo', 'pmo-lead', 'admin', 'super-admin'].includes(slug) ||
              name.includes('hr') ||
              name.includes('pmo') ||
              name.includes('admin')
            );
          })
        : rawList;

      setUsers(contactList);

      // Check if we need to preselect via query parameter or preserve selection
      if (queryUserId) {
        const target = contactList.find(c => String(c._id) === String(queryUserId));
        if (target) {
          setSelectedUser(target);
        }
      }
    } catch (err) {
      toast.error('Failed to load contacts');
    } finally {
      setLoadingUsers(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      loadContacts(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, user]);

  // Fetch conversation messages
  const fetchMessages = async (silent = false) => {
    if (!selectedUser) return;
    if (!silent) setLoadingMessages(true);

    try {
      const res = await messagesAPI.getAll(selectedUser._id);
      const msgs = res.data?.data || [];

      setMessages(prev => {
        if (JSON.stringify(prev) !== JSON.stringify(msgs)) {
          return msgs;
        }
        return prev;
      });

      // Mark incoming unread messages as read
      msgs.forEach(msg => {
        const receiverId = msg.receiver?._id || msg.receiver;
        if (!msg.read && receiverId?.toString() === user?._id?.toString()) {
          messagesAPI.markRead(msg._id).catch(() => {});
        }
      });
    } catch (err) {
      if (!silent) toast.error('Failed to load messages');
    } finally {
      if (!silent) setLoadingMessages(false);
    }
  };

  // Initial load and polling setup
  useEffect(() => {
    if (!selectedUser) {
      setMessages([]);
      return;
    }

    setLoadingMessages(true);
    fetchMessages(false);

    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => {
      fetchMessages(true);
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [selectedUser?._id]);

  const handleSelectUser = (u) => {
    setSelectedUser(u);
    setSearchParams({ userId: u._id });
  };

  const sendMessage = async () => {
    if (!content.trim() || !selectedUser || sending) return;

    const messageContent = content.trim();
    setContent('');
    setSending(true);

    // Optimistic UI update
    const tempId = `temp-${Date.now()}`;
    const tempMsg = {
      _id: tempId,
      sender: { _id: user._id, name: user.name, avatar: user.avatar || user.profileImage },
      receiver: selectedUser._id,
      content: messageContent,
      createdAt: new Date().toISOString(),
      sending: true,
    };

    setMessages(prev => [...prev, tempMsg]);

    try {
      const res = await messagesAPI.send({
        receiver: selectedUser._id,
        content: messageContent,
      });

      // Replace temp message with real one
      setMessages(prev => prev.map(m => (m._id === tempId ? res.data.data : m)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to send message');
      // Rollback optimistic update
      setMessages(prev => prev.filter(m => m._id !== tempId));
      setContent(messageContent);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <PageWrapper>
      <div className="max-w-6xl mx-auto h-[calc(100vh-140px)] flex flex-col font-sans">
        <div className="mb-4">
          <h1 className="font-headline font-bold text-2xl text-slate-900 tracking-tight">Direct Messaging</h1>
          <p className="text-slate-500 text-sm">Direct, person-to-person communication across workspace members</p>
        </div>

        <div className="flex-1 flex gap-6 min-h-0">
          {/* Sidebar / Contact List */}
          <div className="w-80 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-50">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                <input
                  type="text"
                  placeholder="Search contacts..."
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border-none rounded-2xl text-sm focus:ring-2 focus:ring-primary/20 transition-all outline-none"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
              {loadingUsers && users.length === 0 ? (
                <div className="py-10 text-center"><LoadingSpinner size="sm" /></div>
              ) : users.length === 0 ? (
                <div className="py-10 text-center px-4">
                  <p className="text-slate-400 text-sm">No contacts found</p>
                </div>
              ) : (
                users.map(u => (
                  <button
                    key={u._id}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full flex items-center gap-3 p-3 rounded-2xl transition-all duration-200 group text-left ${
                      selectedUser?._id === u._id
                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                        : 'hover:bg-slate-50 border-transparent'
                    } border`}
                  >
                    <div className="relative shrink-0">
                      <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-600 font-bold text-base overflow-hidden shadow-sm">
                        {u.avatar || u.profileImage ? (
                          <img src={u.avatar || u.profileImage} alt={u.name} className="w-full h-full object-cover" />
                        ) : (
                          u.name ? u.name[0].toUpperCase() : 'U'
                        )}
                      </div>
                      <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-white rounded-full"></div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center mb-0.5">
                        <p className={`font-semibold text-sm truncate ${selectedUser?._id === u._id ? 'text-[#2563EB]' : 'text-slate-800'}`}>
                          {u.name}
                        </p>
                      </div>
                      <p className="text-[11px] text-slate-400 font-medium truncate">
                        {u.role?.name || u.designation || `@${u.username || 'user'}`}
                      </p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          {/* Main Chat Area */}
          <div className="flex-1 flex flex-col bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden relative">
            {selectedUser ? (
              <>
                {/* Chat Header */}
                <div className="px-6 py-4 border-b border-slate-50 flex items-center justify-between bg-white z-10">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 flex items-center justify-center text-[#2563EB] font-bold text-base overflow-hidden">
                      {selectedUser.avatar || selectedUser.profileImage ? (
                        <img src={selectedUser.avatar || selectedUser.profileImage} alt="" className="w-full h-full object-cover" />
                      ) : (
                        selectedUser.name ? selectedUser.name[0].toUpperCase() : 'U'
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight">{selectedUser.name}</p>
                      <p className="text-[11px] text-slate-400 font-medium">
                        {selectedUser.role?.name || selectedUser.designation || `@${selectedUser.username}`} • {selectedUser.email}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Messages Panel */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-slate-50/20 custom-scrollbar">
                  {loadingMessages && messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                      <LoadingSpinner text="Getting conversation..." />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center px-10">
                      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                        <span className="material-symbols-outlined text-slate-300 text-3xl">chat_bubble</span>
                      </div>
                      <h3 className="font-bold text-slate-800">No messages yet</h3>
                      <p className="text-slate-400 text-sm mt-1">Start your conversation with {selectedUser.name} by typing below.</p>
                    </div>
                  ) : (
                    <>
                      {messages.map((msg, idx) => {
                        const senderId = msg.sender?._id || msg.sender;
                        const isMe = senderId?.toString() === user?._id?.toString();
                        const nextMsg = messages[idx + 1];
                        const nextIsMe = (nextMsg?.sender?._id || nextMsg?.sender)?.toString() === user?._id?.toString();
                        const isLastInGroup = !nextMsg || nextIsMe !== isMe;

                        return (
                          <div key={msg._id} className={`flex ${isMe ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-300`}>
                            <div className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                              <div
                                className={`px-4 py-2.5 rounded-2xl text-[13.5px] leading-relaxed shadow-sm transition-all ${
                                  isMe
                                    ? `bg-[#2563EB] text-white ${isLastInGroup ? 'rounded-br-sm' : ''}`
                                    : `bg-white text-slate-700 border border-slate-100 ${isLastInGroup ? 'rounded-bl-sm' : ''}`
                                } ${msg.sending ? 'opacity-70 italic' : ''}`}
                              >
                                <p className="whitespace-pre-line">{msg.content}</p>
                              </div>
                              <div className={`flex items-center gap-1.5 mt-1 px-1 ${isMe ? 'flex-row-reverse' : ''}`}>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  {format(new Date(msg.createdAt), 'HH:mm')}
                                </span>
                                {isMe && !msg.sending && (
                                  <span className={`material-symbols-outlined text-[12px] ${msg.read ? 'text-blue-500 font-bold' : 'text-slate-300'}`}>
                                    {msg.read ? 'done_all' : 'check'}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} className="h-2" />
                    </>
                  )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white border-t border-slate-50">
                  <div className="flex items-end gap-3 bg-slate-50 rounded-2xl p-2 pr-3 focus-within:ring-2 focus-within:ring-primary/10 transition-all border border-transparent focus-within:border-primary/20">
                    <textarea
                      rows={1}
                      placeholder="Type your message..."
                      className="flex-1 bg-transparent border-none outline-none py-2 px-3 text-sm resize-none custom-scrollbar min-h-[40px] max-h-[120px]"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      onKeyDown={handleKeyDown}
                    />
                    <button
                      onClick={sendMessage}
                      disabled={!content.trim() || sending}
                      className="w-10 h-10 rounded-xl bg-[#2563EB] text-white flex items-center justify-center shadow-lg shadow-blue-500/20 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all"
                    >
                      <span className="material-symbols-outlined text-xl">send</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-slate-50/10">
                <div className="w-20 h-20 bg-slate-50 rounded-3xl flex items-center justify-center mb-6 shadow-sm">
                  <span className="material-symbols-outlined text-slate-200 text-5xl">forum</span>
                </div>
                <h2 className="text-xl font-bold text-slate-800">Your Messages</h2>
                <p className="text-slate-400 text-sm max-w-sm mt-2">
                  Select a contact from the left list to start a person-to-person conversation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </PageWrapper>
  );
}
