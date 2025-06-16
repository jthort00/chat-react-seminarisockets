// src/components/Chat/Chat.tsx
import React, { useEffect, useRef, useState } from 'react';
import './Chat.css';
import { io, Socket } from 'socket.io-client';
import { useLocation } from 'react-router-dom';
import { User } from '../../types/types';

interface ChatMessage {
  room: string;
  author: string;
  message: string;
  time: string;
  type?: 'user' | 'system'; // Add this line if not present
}

const Chat: React.FC = () => {
  const location = useLocation();
  const user = location.state?.user as User; // Accede al usuario pasado por navigate
  const [room, setRoom] = useState('sala1');
  const [currentMessage, setCurrentMessage] = useState('');
  const [messageList, setMessageList] = useState<ChatMessage[]>([]);
  const [showChat, setShowChat] = useState(false);
  const [typingUser, setTypingUser] = useState<string | null>(null);

  const socketRef = useRef<Socket | null>(null);
  const chatBodyRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');

    socketRef.current = io('http://localhost:3001', {
      auth: {
        token,
      },
    });

    socketRef.current.on('receive_message', (data: ChatMessage) => {
      setMessageList(prev => [...prev, data]);
    });

    // Listen for typing event
    socketRef.current.on('user_typing', (data: { author: string }) => {
        console.debug(`${data.author} is typing...`);
        if (data.author !== user.name) {
            setTypingUser(data.author);
            setTimeout(() => setTypingUser(null), 2500);
        }
    });

    socketRef.current.on('status', (data) => {
      console.debug('Estado recibido:', data);
      if (data.status === 'unauthorized') {
        window.location.href = '/';
      }
    });

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (chatBodyRef.current) {
      chatBodyRef.current.scrollTop = chatBodyRef.current.scrollHeight;
    }
  }, [messageList]);

  const joinRoom = () => {    
    if (room) {
      socketRef.current?.emit('join_room', room, user.name);
      setShowChat(true);

      setMessageList(prev => [
      ...prev,
      {
        room,
        author: user.name,
        message: `You joined the chat`,
        time: new Date().toLocaleTimeString(),
        type: 'system', // Indicate that this message is from the system
      }
    ]); 
    }
  };

  const sendMessage = async () => {
    if (currentMessage !== '') {
      const messageData: ChatMessage = {
        room,
        author: user.name,
        message: currentMessage,
        time: new Date().toLocaleTimeString(),
        type: 'user', // Indicate that this message is from the user
      };

      await socketRef.current?.emit('send_message', messageData);
      setMessageList(prev => [...prev, messageData]);
      setCurrentMessage('');
    }
  };

  const handleTyping = () => {
    if (socketRef.current) {
      socketRef.current.emit('typing', room, user.name );
    }
  };

  return (
    <div className="chat-container">
      {!showChat ? (
        <div className="join-chat">
          <h2>Bienvenid@ al Chat {user.name}</h2>
          <input
            type="text"
            placeholder="Sala..."
            value={room}
            onChange={(e) => setRoom(e.target.value)}
          />
          <button onClick={joinRoom}>Unirse a la Sala</button>
        </div>
      ) : (
        <div className="chat-box">
          <div className="chat-header">Sala: {room}</div>
          <div className="chat-body" ref={chatBodyRef}>
            {messageList.map((msg, index) => (
              <div
                key={index}
                className={`message ${msg.type === 'system' ? 'system-message' : msg.author === user.name ? 'own' : 'other'}`}
              >
                <div className="bubble">
                  <p>{msg.message}</p>
                  <div className="meta">
                    <span>{msg.author}</span>
                    <span>{msg.time}</span>
                  </div>
                </div>
              </div>
            ))}
            {typingUser && (
              <div style={{ color: '#888', fontStyle: 'italic', marginBottom: 4 }}>
                {typingUser} is typing...
              </div>
            )}
          </div>
          <div className="chat-footer">
            <input
              type="text"
              placeholder="Mensaje..."
              value={currentMessage}
              onChange={(e) => setCurrentMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') sendMessage();
                handleTyping(); // Emit typing event on any key press
              }}
              onInput={handleTyping} // Also emit on input for better UX
            />
            <button onClick={sendMessage}>Enviar</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Chat;
