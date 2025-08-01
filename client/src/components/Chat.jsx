import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';

const Chat = ({ messages, onSendMessage, username }) => {
  const [newMessage, setNewMessage] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (newMessage.trim()) {
      onSendMessage(newMessage);
      setNewMessage('');
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const isOwnMessage = (author) => author === username;

  return (
    <div className="chat-container">
      <div className="chat-header">
        <MessageCircle size={20} />
        <h3>Chat</h3>
        <span className="message-count">{messages.length}</span>
      </div>

      <div className="messages-container">
        {messages.length === 0 ? (
          <div className="empty-state">
            <p>No messages yet</p>
            <p>Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`message ${isOwnMessage(message.author) ? 'own-message' : 'other-message'}`}
            >
              <div className="message-header">
                <span className="author">{message.author}</span>
                <span className="timestamp">{formatTime(message.timestamp)}</span>
              </div>
              <div className="message-content">
                {message.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input">
        <div className="input-container">
          <input
            ref={inputRef}
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            maxLength={500}
          />
          <button
            onClick={handleSend}
            disabled={!newMessage.trim()}
            className="send-button"
          >
            <Send size={16} />
          </button>
        </div>
        <div className="character-count">
          {newMessage.length}/500
        </div>
      </div>

      <style jsx>{`
        .chat-container {
          background: white;
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          height: 500px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .chat-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          border-bottom: 1px solid #e2e8f0;
          background: #f8fafc;
          border-radius: 12px 12px 0 0;
        }

        .chat-header h3 {
          margin: 0;
          flex: 1;
          color: #1e293b;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .message-count {
          background: #e2e8f0;
          color: #64748b;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .messages-container {
          flex: 1;
          padding: 16px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .messages-container::-webkit-scrollbar {
          width: 6px;
        }

        .messages-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .messages-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .empty-state {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          color: #64748b;
          text-align: center;
        }

        .empty-state p {
          margin: 4px 0;
        }

        .message {
          display: flex;
          flex-direction: column;
          max-width: 80%;
        }

        .own-message {
          align-self: flex-end;
        }

        .other-message {
          align-self: flex-start;
        }

        .message-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 4px;
          font-size: 0.8rem;
        }

        .author {
          font-weight: 600;
          color: #475569;
        }

        .own-message .author {
          color: #667eea;
        }

        .timestamp {
          color: #94a3b8;
          font-size: 0.75rem;
        }

        .message-content {
          padding: 8px 12px;
          border-radius: 12px;
          word-wrap: break-word;
          line-height: 1.4;
        }

        .own-message .message-content {
          background: #667eea;
          color: white;
          border-bottom-right-radius: 4px;
        }

        .other-message .message-content {
          background: #f1f5f9;
          color: #1e293b;
          border-bottom-left-radius: 4px;
        }

        .chat-input {
          padding: 16px;
          border-top: 1px solid #e2e8f0;
        }

        .input-container {
          display: flex;
          gap: 8px;
          margin-bottom: 8px;
        }

        .input-container input {
          flex: 1;
          padding: 10px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          transition: border-color 0.2s;
        }

        .input-container input:focus {
          outline: none;
          border-color: #667eea;
        }

        .send-button {
          padding: 10px 12px;
          background: #667eea;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: background-color 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .send-button:hover:not(:disabled) {
          background: #5a67d8;
        }

        .send-button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .character-count {
          text-align: right;
          font-size: 0.75rem;
          color: #94a3b8;
        }

        @media (max-width: 768px) {
          .chat-container {
            height: 300px;
          }

          .message {
            max-width: 90%;
          }
        }
      `}</style>
    </div>
  );
};

export default Chat;
