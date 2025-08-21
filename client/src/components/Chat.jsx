import React, { useState, useRef, useEffect } from 'react';
import { Send, MessageCircle } from 'lucide-react';
import styles from './Chat.module.css';

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
    <div className={styles.chatContainer}>
      <div className={styles.chatHeader}>
        <MessageCircle size={20} />
        <h3>Chat</h3>
        <span className={styles.messageCount}>{messages.length}</span>
      </div>

      <div className={styles.messagesContainer}>
        {messages.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No messages yet</p>
            <p>Start the conversation!</p>
          </div>
        ) : (
          messages.map((message, index) => (
            <div
              key={index}
              className={`${styles.message} ${isOwnMessage(message.author) ? styles.ownMessage : styles.otherMessage}`}
            >
              <div className={styles.messageHeader}>
                <span className={styles.author}>{message.author}</span>
                <span className={styles.timestamp}>{formatTime(message.timestamp)}</span>
              </div>
              <div className={styles.messageContent}>
                {message.message}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className={styles.chatInput}>
        <div className={styles.inputContainer}>
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
            className={styles.sendButton}
          >
            <Send size={16} />
          </button>
        </div>
        <div className={styles.characterCount}>
          {newMessage.length}/500
        </div>
      </div>
    </div>
  );
};

export default Chat;
