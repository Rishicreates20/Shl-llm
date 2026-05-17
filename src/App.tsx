/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';

type Message = {
// ...
  role: string;
  content: string;
  recommendations?: any[];
};

export default function App() {
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    content: "Hi! I am the SHL Converational Assessment Recommender. Tell me about the role you are hiring for, and I will help you find the right assessments."
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState<'ok' | 'loading' | 'error'>('loading');
  const [shortlist, setShortlist] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch('/health').then(res => {
      if (res.ok) setStatus('ok');
      else setStatus('error');
    }).catch(() => setStatus('error'));
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;
    
    // Using user message
    const userMsg = { role: 'user', content: input };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Skip the very first hardcoded assistant greeting for the API state
        body: JSON.stringify({ messages: newMessages.slice(1) })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Server error');
      }

      let assistantContent = data.reply || "";

      setMessages([...newMessages, { role: 'assistant', content: assistantContent, recommendations: data.recommendations }]);
      
    } catch(err: any) {
      console.error(err);
      setMessages([...newMessages, { role: 'assistant', content: `Error: ${err.message || 'Sorry, there was an error processing your request.'}`}]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#f4f4f4] text-black p-4 sm:p-10 select-none font-sans">
      <div className="flex-1 border-[3px] border-black flex flex-col relative bg-white overflow-hidden">
        {/* Header */}
        <div className="flex border-b-[3px] border-black flex-shrink-0">
          <div className="w-12 sm:w-16 border-r-[3px] border-black flex items-center justify-center p-2 sm:p-4 bg-zinc-100">
            <span className="vertical-text font-black text-xs sm:text-sm uppercase tracking-[0.3em]">SHL v.1</span>
          </div>
          <div className="flex-1 p-4 sm:p-8 flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white">
            <div className="space-y-1">
              <p className="text-[10px] sm:text-xs font-black uppercase tracking-widest bg-black text-white px-2 py-1 inline-block">System Status</p>
              <div className="flex items-center space-x-3 mt-2">
                <p className="text-lg sm:text-xl font-bold italic serif-italic">Conversational Agent</p>
                {status === 'ok' ? (
                   <span className="h-3 w-3 bg-black rounded-full" title="Systems Check OK"></span>
                ) : status === 'loading' ? (
                   <span className="h-3 w-3 bg-zinc-400 rounded-full animate-pulse" title="Booting..."></span>
                ) : (
                   <span className="h-3 w-3 bg-red-600 rounded-full" title="Error"></span>
                )}
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 text-left sm:text-right mt-4 sm:mt-0">
              <div>
                <p className="text-3xl sm:text-5xl font-black tracking-tighter">SHL</p>
                <p className="text-[10px] font-bold uppercase tracking-tighter opacity-50">Assessment Engine</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Area Wrapper */}
        <div className="flex flex-1 overflow-hidden">
          {/* Main Chat Area */}
          <main className="flex-1 overflow-y-auto w-full flex flex-col bg-white">
            <div className="flex-1 p-6 sm:p-10 space-y-8 flex flex-col w-full max-w-5xl mx-auto">
              {messages.map((msg, i) => (
                <div key={i} className={`flex w-full ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'user' ? (
                    <div className="max-w-2xl px-6 py-5 bg-black text-white font-bold leading-relaxed border-[3px] border-black shadow-[6px_6px_0_0_#e4e4e7]">
                      {msg.content}
                    </div>
                  ) : (
                    <div className="max-w-3xl px-6 py-5 bg-white text-black font-medium leading-relaxed border-[3px] border-black shadow-[6px_6px_0_0_#000] whitespace-pre-wrap flex flex-col gap-2">
                      <div>{msg.content}</div>
                      {msg.recommendations && msg.recommendations.length > 0 && (
                        <div className="space-y-3 mt-2 border-t-[3px] border-black pt-4">
                          <p className="font-black uppercase tracking-widest text-sm">Recommended Assessments:</p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {msg.recommendations.map((rec: any, idx: number) => {
                              const isSelected = shortlist.some(s => s.name === rec.name);
                              return (
                                <div key={idx} className="border-[3px] border-black p-3 bg-zinc-50 flex flex-col justify-between">
                                  <div>
                                    <a href={rec.url} target="_blank" rel="noreferrer" className="font-bold underline hover:text-blue-600 block mb-1">
                                      {rec.name}
                                    </a>
                                    <span className="text-xs uppercase font-bold text-zinc-500">{rec.test_type}</span>
                                  </div>
                                  <button 
                                    onClick={() => {
                                      if (isSelected) {
                                        setShortlist(s => s.filter(x => x.name !== rec.name));
                                      } else {
                                        setShortlist(s => [...s, rec]);
                                      }
                                    }}
                                    className={`mt-3 py-2 border-[2px] border-black text-xs font-black uppercase tracking-widest transition-all ${isSelected ? 'bg-black text-white' : 'bg-transparent text-black hover:bg-black hover:text-white'}`}
                                  >
                                    {isSelected ? '✓ Selected' : 'Select'}
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start w-full">
                  <div className="px-6 py-5 bg-zinc-100 border-[3px] border-black text-black font-black uppercase tracking-widest shadow-[6px_6px_0_0_#000] animate-pulse text-xs">
                    Processing...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} className="h-1" />
            </div>
          </main>

          {/* Shortlist Sidebar */}
          {shortlist.length > 0 && (
            <aside className="w-80 border-l-[3px] border-black flex flex-col bg-zinc-50 flex-shrink-0">
              <div className="p-4 border-b-[3px] border-black bg-black text-white font-black uppercase tracking-widest flex justify-between items-center">
                <span>Shortlist ({shortlist.length})</span>
                <button onClick={() => setShortlist([])} className="text-[10px] underline hover:no-underline text-zinc-300">Clear</button>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {shortlist.map((item, i) => (
                  <div key={i} className="border-[3px] border-black p-3 bg-white shadow-[4px_4px_0_0_#000] flex flex-col">
                    <h4 className="font-bold text-sm">{item.name}</h4>
                    <p className="text-xs uppercase text-zinc-500 mt-1 font-bold">{item.test_type}</p>
                    <button 
                      onClick={() => setShortlist(s => s.filter(x => x.name !== item.name))}
                      className="mt-3 w-full border-[2px] border-black py-1 text-xs font-bold uppercase hover:bg-black hover:text-white transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
              <div className="p-4 border-t-[3px] border-black bg-white">
                <button className="w-full border-[3px] border-black bg-white text-black py-3 font-black uppercase tracking-widest hover:bg-black hover:text-white transition-all shadow-[4px_4px_0_0_#000] active:shadow-none active:translate-x-[4px] active:translate-y-[4px]">
                  Compare
                </button>
              </div>
            </aside>
          )}
        </div>

        {/* Input Area */}
        <div className="border-t-[3px] border-black p-4 sm:p-6 bg-zinc-100 flex-shrink-0">
          <div className="max-w-5xl mx-auto flex flex-col sm:flex-row gap-4">
            <input 
              type="text" 
              value={input}
              onChange={e => {
                const newValue = e.target.value;
                if (/^[a-zA-Z0-9\s]*$/.test(newValue)) {
                  setInput(newValue);
                }
              }}
              onKeyDown={e => e.key === 'Enter' && sendMessage()}
              placeholder="DEFINE REQUIREMENTS..."
              className="flex-1 px-5 py-4 border-[3px] border-black font-bold placeholder-zinc-400 focus:outline-none focus:ring-0 shadow-[4px_4px_0_0_#000] bg-white text-sm sm:text-base transition-all focus:shadow-[2px_2px_0_0_#000] focus:translate-x-[2px] focus:translate-y-[2px]"
              disabled={isLoading || status !== 'ok'}
            />
            <button 
              onClick={sendMessage}
              disabled={!input.trim() || isLoading || status !== 'ok'}
              className="border-[3px] border-black bg-black text-white px-8 py-4 font-black uppercase tracking-widest hover:bg-white hover:text-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[4px_4px_0_0_#000] active:shadow-none active:translate-x-[4px] active:translate-y-[4px] flex items-center justify-center min-w-[140px]"
            >
              Execute
            </button>
          </div>
        </div>
      </div>
      
      {/* Footer */}
      <div className="flex justify-between mt-4 text-[10px] font-black uppercase tracking-[0.4em] opacity-40">
        <span className="hidden sm:inline">Terminal.SHL.01</span>
        <span>©2026 SHL Labs</span>
      </div>
    </div>
  );
}
