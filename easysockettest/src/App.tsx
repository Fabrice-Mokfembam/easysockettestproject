import { useState, useEffect } from 'react';
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
    // Outer div to centralize content vertically and horizontally on the page
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="p-8 font-sans max-w-xl mx-auto border border-gray-200 rounded-lg shadow-md bg-white">
        <h1 className="text-center text-3xl font-semibold text-gray-800 mb-6">
          WebSocket Connection Status
        </h1>
        <p className="text-center text-lg mb-8">
          Status:{' '}
          <span
            className={`font-bold ${
              status === 'connected'
                ? 'text-green-600'
                : status === 'reconnecting'
                ? 'text-orange-500'
                : 'text-red-600'
            }`}
          >
            {status.toUpperCase()}
          </span>
        </p>

        <div className="flex gap-4 justify-center mt-6">
          <button
            onClick={handleConnectClick}
            disabled={status === 'connected' || status === 'reconnecting'}
            className="px-6 py-3 bg-green-500 text-white rounded-md cursor-pointer text-lg font-medium hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Connect
          </button>
          <button
            onClick={handleDisconnectClick}
            disabled={status === 'disconnected' || status === 'error'}
            className="px-6 py-3 bg-red-500 text-white rounded-md cursor-pointer text-lg font-medium hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200"
          >
            Disconnect
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;