import React from 'react';
import { Users, Crown, User } from 'lucide-react';

const UserList = ({ users, currentUsername }) => {
  const getDisplayName = (user) => {
    if (user.username === currentUsername) {
      return `${user.username} (You)`;
    }
    return user.username;
  };

  return (
    <div className="user-list">
      <div className="user-list-header">
        <Users size={20} />
        <h3>Participants</h3>
        <span className="user-count">{users.length}</span>
      </div>

      <div className="users-container">
        {users.length === 0 ? (
          <div className="empty-state">
            <p>No participants yet</p>
          </div>
        ) : (
          users.map((user, index) => (
            <div
              key={index}
              className={`user-item ${user.username === currentUsername ? 'current-user' : ''}`}
            >
              <div className="user-avatar">
                {user.isHost ? (
                  <Crown size={16} className="host-icon" />
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className="user-info">
                <span className="username">{getDisplayName(user)}</span>
                {user.isHost && <span className="role-badge">Host</span>}
              </div>
            </div>
          ))
        )}
      </div>

      <style jsx>{`
        .user-list {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
        }

        .user-list-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 16px 20px;
          background: #f8fafc;
          border-bottom: 1px solid #e2e8f0;
        }

        .user-list-header h3 {
          margin: 0;
          flex: 1;
          color: #1e293b;
          font-size: 1.1rem;
          font-weight: 600;
        }

        .user-count {
          background: #e2e8f0;
          color: #64748b;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.8rem;
          font-weight: 500;
        }

        .users-container {
          padding: 12px;
          max-height: 300px;
          overflow-y: auto;
        }

        .users-container::-webkit-scrollbar {
          width: 6px;
        }

        .users-container::-webkit-scrollbar-track {
          background: #f1f5f9;
          border-radius: 3px;
        }

        .users-container::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 3px;
        }

        .users-container::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .empty-state {
          padding: 20px;
          text-align: center;
          color: #64748b;
        }

        .empty-state p {
          margin: 0;
        }

        .user-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border-radius: 8px;
          transition: background-color 0.2s;
          margin-bottom: 4px;
        }

        .user-item:hover {
          background: #f8fafc;
        }

        .current-user {
          background: #eff6ff;
          border: 1px solid #dbeafe;
        }

        .current-user:hover {
          background: #dbeafe;
        }

        .user-avatar {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e2e8f0;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #64748b;
          flex-shrink: 0;
        }

        .current-user .user-avatar {
          background: #3b82f6;
          color: white;
        }

        .host-icon {
          color: #f59e0b;
        }

        .current-user .host-icon {
          color: #fbbf24;
        }

        .user-info {
          flex: 1;
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
        }

        .username {
          font-weight: 500;
          color: #1e293b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .current-user .username {
          color: #1e40af;
        }

        .role-badge {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
          color: white;
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.7rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.3px;
          flex-shrink: 0;
        }

        @media (max-width: 768px) {
          .user-item {
            gap: 8px;
            padding: 8px 10px;
          }

          .user-avatar {
            width: 28px;
            height: 28px;
          }

          .username {
            font-size: 0.9rem;
          }

          .role-badge {
            font-size: 0.65rem;
            padding: 1px 6px;
          }
        }
      `}</style>
    </div>
  );
};

export default UserList;
