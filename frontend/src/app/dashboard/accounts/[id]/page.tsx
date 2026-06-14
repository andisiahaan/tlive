'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';

interface TiktokEvent {
  id: string;
  type: string;
  payload: any;
  timestamp: Date;
}

export default function AccountShowPage() {
  const params = useParams();
  const router = useRouter();
  const accountId = params.id as string;
  const [events, setEvents] = useState<TiktokEvent[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const eventsEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom
  const scrollToBottom = () => {
    eventsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [events]);

  useEffect(() => {
    if (!accountId) return;

    const token = localStorage.getItem('token');
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    
    // Connect to Server-Sent Events (SSE)
    const sseUrl = `${apiUrl}/accounts/${accountId}/events?token=${token}`;
    const eventSource = new EventSource(sseUrl);

    eventSource.onopen = () => {
      setIsConnected(true);
    };

    eventSource.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        const newEvent: TiktokEvent = {
          id: Math.random().toString(36).substring(7),
          type: data.type,
          payload: data.payload,
          timestamp: new Date(),
        };
        
        setEvents((prev) => [...prev, newEvent].slice(-100)); // Keep last 100 events
      } catch (err) {
        console.error('Failed to parse SSE event', err);
      }
    };

    eventSource.onerror = (err) => {
      console.error('SSE Error:', err);
      setIsConnected(false);
      // EventSource auto-reconnects, but we can manage UI state here
    };

    return () => {
      eventSource.close();
    };
  }, [accountId]);

  const renderPayload = (type: string, payload: any) => {
    switch (type) {
      case 'chat':
        return (
          <div className="flex gap-3 items-center">
            <img src={payload.profilePictureUrl} alt="" className="w-8 h-8 rounded-full border border-gray-700" />
            <div>
              <span className="font-semibold text-indigo-400">{payload.uniqueId}: </span>
              <span className="text-gray-200">{payload.comment}</span>
            </div>
          </div>
        );
      case 'gift':
        return (
          <div className="flex gap-3 items-center p-2 bg-indigo-900/30 rounded-lg border border-indigo-500/30">
            <img src={payload.profilePictureUrl} alt="" className="w-8 h-8 rounded-full" />
            <div>
              <span className="font-semibold text-pink-400">{payload.uniqueId} </span>
              <span className="text-gray-300">sent {payload.giftName} x{payload.repeatCount} 🎁</span>
            </div>
          </div>
        );
      case 'like':
        return (
          <div className="flex gap-3 items-center text-sm">
            <span className="font-semibold text-red-400">{payload.uniqueId} </span>
            <span className="text-gray-400">liked the stream ❤️ ({payload.likeCount} likes)</span>
          </div>
        );
      case 'member':
        return (
          <div className="flex gap-3 items-center text-sm">
            <span className="font-semibold text-green-400">{payload.uniqueId} </span>
            <span className="text-gray-400">joined the stream 👋</span>
          </div>
        );
      case 'social':
        return (
          <div className="flex gap-3 items-center text-sm">
            <img src={payload.profilePictureUrl || ''} alt="" className="w-6 h-6 rounded-full" onError={(e) => e.currentTarget.style.display = 'none'} />
            <div>
              <span className="font-semibold text-blue-400">{payload.uniqueId || 'Someone'} </span>
              <span className="text-gray-300">
                {payload.displayType === 'pm_mt_msg_viewer_share' ? 'shared the LIVE stream 🚀' : 
                 payload.displayType === 'pm_main_follow_message_viewer_2' ? 'started following the host 👤' : 
                 'interacted with the stream 🌟'}
              </span>
            </div>
          </div>
        );
      case 'envelope':
        return (
          <div className="flex gap-3 items-center text-sm p-2 bg-orange-900/30 rounded-lg border border-orange-500/30">
            <span className="font-semibold text-orange-400">Treasure Box 🎁</span>
            <span className="text-gray-300">A treasure box has been dropped!</span>
          </div>
        );
      case 'roomUser':
        return (
          <div className="flex gap-3 items-center text-sm">
            <span className="text-gray-400">Viewer count updated: </span>
            <span className="font-semibold text-emerald-400">{payload.viewerCount?.toLocaleString() || 0} viewers</span>
          </div>
        );
      default:
        return (
          <div className="text-sm">
            <span className="text-gray-400">System generated a </span>
            <span className="font-semibold text-indigo-400 uppercase">{type}</span>
            <span className="text-gray-400"> event</span>
          </div>
        );
    }
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-900/80 backdrop-blur-xl p-6 rounded-2xl border border-gray-800 shadow-xl">
        <div className="flex items-center gap-4">
          <button 
            onClick={() => router.push('/dashboard')}
            className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-3">
              Live Event Stream
              <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium border ${isConnected ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`} />
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Monitoring events for Account ID: {accountId}</p>
          </div>
        </div>
      </div>

      {/* Events Feed */}
      <div className="bg-gray-900/50 backdrop-blur-md border border-gray-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col h-[70vh]">
        <div className="p-4 border-b border-gray-800 bg-gray-900/80 flex justify-between items-center">
          <h3 className="font-semibold text-gray-200">Real-time Feed</h3>
          <span className="text-xs text-gray-500">{events.length} events received</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {events.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <div className="w-16 h-16 rounded-full border-4 border-gray-800 border-t-indigo-500 animate-spin" />
              <p>Waiting for live events...</p>
            </div>
          ) : (
            events.map((evt) => (
              <div 
                key={evt.id} 
                className="bg-gray-800/50 hover:bg-gray-800/80 transition-colors p-4 rounded-xl border border-gray-700/50 shadow-sm animate-in fade-in slide-in-from-bottom-4 duration-300"
              >
                <div className="flex justify-between items-start mb-2">
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 bg-gray-950 rounded-md text-indigo-300 border border-indigo-900/50">
                    {evt.type}
                  </span>
                  <span className="text-xs text-gray-500 font-mono">
                    {evt.timestamp.toLocaleTimeString()}
                  </span>
                </div>
                <div className="mt-2">
                  {renderPayload(evt.type, evt.payload)}
                </div>
              </div>
            ))
          )}
          <div ref={eventsEndRef} />
        </div>
      </div>
    </div>
  );
}
