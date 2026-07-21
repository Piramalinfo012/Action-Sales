import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageCircle, X, Send, Loader2, User as UserIcon } from 'lucide-react';
import { User } from '../types';
import { API_URL, formatToDDMMYYYY } from '../api';

interface ChatboxWidgetProps {
  user: User;
}

interface ChatMessage {
  timestamp: string;
  name: string;
  role: string;
  message: string;
}

export default function ChatboxWidget({ user }: ChatboxWidgetProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchMessages = async () => {
    try {
      const response = await fetch(`${API_URL}?sheet=Chatbox&t=${Date.now()}`, { cache: 'no-store' });
      const result = await response.json();
      if (result.success && result.data) {
        // Skip header row if it exists
        const dataRows = result.data.length > 0 && typeof result.data[0][0] === 'string' && result.data[0][0].toLowerCase().includes('time') 
          ? result.data.slice(1) 
          : result.data;
        
        const msgs = dataRows.map((row: any[]) => ({
          timestamp: row[0] || '',
          name: row[1] || 'Unknown',
          role: row[2] || '',
          message: row[3] || ''
        })).filter((m: ChatMessage) => m.message.trim() !== '');
        
        setMessages(msgs);
      }
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchMessages().finally(() => setIsLoading(false));
      
      const interval = setInterval(fetchMessages, 10000);
      return () => clearInterval(interval);
    }
  }, [isOpen]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const msgText = newMessage.trim();
    setNewMessage('');

    // Optimistic update
    const newMsgObj: ChatMessage = {
      timestamp: new Date().toISOString(),
      name: user.name,
      role: user.role,
      message: msgText
    };
    setMessages(prev => [...prev, newMsgObj]);

    try {
      const rowData = [
        new Date().toLocaleString(),
        user.name,
        user.role,
        msgText
      ];
      const query = `?sheetName=Chatbox&action=insert&rowData=${encodeURIComponent(JSON.stringify(rowData))}`;
      await fetch(`${API_URL}${query}`, { method: 'POST' });
      // Fetch fresh messages
      await fetchMessages();
    } catch (err) {
      console.error('Failed to send message', err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 p-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full shadow-2xl z-50 transition-colors ${isOpen ? 'hidden' : 'flex'}`}
      >
        <MessageCircle className="w-6 h-6" />
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.95 }}
            className="fixed bottom-6 right-6 w-[350px] h-[500px] bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-emerald-600 p-4 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <MessageCircle className="w-5 h-5" />
                <h3 className="font-bold">Team Chat</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-emerald-100 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 dark:bg-slate-900/50 flex flex-col gap-3">
              {isLoading && messages.length === 0 ? (
                <div className="flex-1 flex justify-center items-center">
                  <Loader2 className="w-6 h-6 text-emerald-500 animate-spin" />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex-1 flex justify-center items-center text-sm text-slate-500">
                  No messages yet. Start the conversation!
                </div>
              ) : (
                messages.map((msg, idx) => {
                  const isMe = msg.name === user.name;
                  return (
                    <div key={idx} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                      <div className="text-[10px] text-slate-500 mb-1 px-1 font-medium flex items-center gap-1">
                        {!isMe && <span>{msg.name} ({msg.role})</span>}
                      </div>
                      <div className={`px-3 py-2 rounded-2xl max-w-[85%] text-sm shadow-sm ${
                        isMe 
                          ? 'bg-emerald-500 text-white rounded-br-none' 
                          : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-bl-none'
                      }`}>
                        {msg.message}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <form onSubmit={handleSendMessage} className="p-3 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 shrink-0">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 rounded-xl px-4 py-2 text-sm outline-none transition-all dark:text-white"
                />
                <button
                  type="submit"
                  disabled={!newMessage.trim() || isSending}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition-colors flex items-center justify-center"
                >
                  {isSending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
