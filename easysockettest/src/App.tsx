

import  { useState, useEffect } from 'react';
import { connect, disconnect, isConnected, on, off } from '@mokfembam/easysocket-client';


const WS_URL = 'ws://localhost:8080/websocket';

function App() {

  const [status, setStatus] = useState('disconnected');

  useEffect(() => {
    const handleConnected = () => {
      setStatus('connected');
      console.log('WebSocket: Connected!');
    };

    const handleDisconnected = () => {
      setStatus('disconnected');
      console.log('WebSocket: Disconnected.');
    };

    const handleReconnecting = () => {
      setStatus('reconnecting');
      console.log('WebSocket: Attempting to reconnect...');
    };

    const handleError = (error: Event) => { 
      setStatus('error');
      console.error('WebSocket Error from library:', error);
    };

    on('connected', handleConnected);
    on('disconnected', handleDisconnected);
    on('reconnecting', handleReconnecting);
    on('error', handleError);

  
    if (!isConnected()) {
      console.log('Attempting initial WebSocket connection...');
      connect(WS_URL);
    }

    // Cleanup: Unsubscribe from events when component unmounts
    return () => {
      off('connected', handleConnected);
      off('disconnected', handleDisconnected);
      off('reconnecting', handleReconnecting);
      off('error', handleError);

  
    };
  }, []);


  const handleConnectClick = () => {
    console.log('User clicked Connect.');
    connect(WS_URL);
  };

  const handleDisconnectClick = () => {
    console.log('User clicked Disconnect.');
    disconnect();
  };

  // --- Render UI ---
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif', maxWidth: '600px', margin: 'auto', border: '1px solid #eee', borderRadius: '8px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
      <h1 style={{ textAlign: 'center', color: '#333' }}>WebSocket Connection Status</h1>
      <p style={{ textAlign: 'center', fontSize: '1.2em' }}>
        Status: <span style={{ color: status === 'connected' ? 'green' : (status === 'reconnecting' ? 'orange' : 'red'), fontWeight: 'bold' }}>
          {status.toUpperCase()}
        </span>
      </p>

      <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', marginTop: '30px' }}>
        <button
          onClick={handleConnectClick}
          disabled={status === 'connected' || status === 'reconnecting'}
          style={{ padding: '10px 20px', backgroundColor: '#28a745', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1em' }}
        >
          Connect
        </button>
        <button
          onClick={handleDisconnectClick}
          disabled={status === 'disconnected' || status === 'error'}
          style={{ padding: '10px 20px', backgroundColor: '#dc3545', color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer', fontSize: '1em' }}
        >
          Disconnect
        </button>
      </div>
    </div>
  );
}

export default App;