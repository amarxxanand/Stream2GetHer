import React from 'react';
import { Users, Crown, User } from 'lucide-react';
import styles from './UserList.module.css';

const UserList = ({ users, currentUsername }) => {
  const getDisplayName = (user) => {
    if (user.username === currentUsername) {
      return `${user.username} (You)`;
    }
    return user.username;
  };

  return (
    <div className={styles['user-list']}>
      <div className={styles['user-list-header']}>
        <Users size={20} />
        <h3>Participants</h3>
        <span className={styles['user-count']}>{users.length}</span>
      </div>

      <div className={styles['users-container']}>
        {users.length === 0 ? (
          <div className={styles['empty-state']}>
            <p>No participants yet</p>
          </div>
        ) : (
          users.map((user, index) => (
            <div
              key={index}
              className={`${styles['user-item']} ${user.username === currentUsername ? styles['current-user'] : ''}`}
            >
              <div className={styles['user-avatar']}>
                {user.isHost ? (
                  <Crown size={16} className={styles['host-icon']} />
                ) : (
                  <User size={16} />
                )}
              </div>
              <div className={styles['user-info']}>
                <span className={styles.username}>{getDisplayName(user)}</span>
                {user.isHost && <span className={styles['role-badge']}>Host</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default UserList;
