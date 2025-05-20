import React, { useRef, useState, useEffect } from 'react';
import { Trash2, Mic } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';

const InstructionsChat = ({
  messages,
  newMessage,
  setNewMessage,
  hoveredMessage,
  setHoveredMessage,
  deletingMessageId,
  handleSendMessage,
  handleEditMessage,
  handleDeleteMessage,
  formatInstructionHtml
}) => {
  // Voice transcription states and refs
  const [isRecording, setIsRecording] = useState(false);
  const micStreamRef = useRef(null);
  const dgSocketRef = useRef(null);
  const recorderRef = useRef(null);
  const inputRef = useRef(null);
  const transcriptData = useRef({
    finalText: '',
    interimText: '',
    startingContent: ''
  }).current;

  // Start Deepgram connection
  const startDeepgramConnection = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      micStreamRef.current = stream;

      const key = import.meta.env.VITE_DEEPGRAM_KEY;
      if (!key) throw new Error('VITE_DEEPGRAM_KEY not set');

      // Using parameters to prevent duplications but not replacing entire text
      const wsUrl = `wss://api.deepgram.com/v1/listen?model=nova-2&language=en-US&interim_results=true&smart_format=true&endpointing=true&punctuate=true&utterance_end=true`;
      const socket = new WebSocket(wsUrl, ['token', key]);
      dgSocketRef.current = socket;

      // Store the current message when starting to record to preserve it
      const existingText = newMessage.trim();
      transcriptData.startingContent = existingText;
      transcriptData.finalText = '';
      transcriptData.interimText = '';
      
      socket.onopen = () => {
        recorderRef.current = new MediaRecorder(stream, { mimeType: 'audio/webm' });
        recorderRef.current.start(250);
        recorderRef.current.ondataavailable = (e) => {
          if (socket.readyState === WebSocket.OPEN) socket.send(e.data);
        };
        setIsRecording(true);
      };

      // Keep track of phrases we've already added to avoid duplicates
      const addedPhrases = new Set();

      socket.onmessage = (msg) => {
        try {
          const result = JSON.parse(msg.data);
          
          if (result.type === 'Results' && result.channel?.alternatives?.[0]) {
            const transcript = result.channel.alternatives[0].transcript || '';
            const isInterim = result.is_final === false;
            
            // Skip empty transcripts
            if (!transcript.trim()) return;
            
            if (isInterim) {
              // For interim results, just show temporarily without adding to final text
              transcriptData.interimText = transcript;
              
              // Combine existing text with current interim transcript
              const fullText = [
                transcriptData.startingContent,
                transcriptData.finalText,
                transcriptData.interimText
              ].filter(Boolean).join(' ').trim();
              
              setNewMessage(fullText);
            } else {
              // Handle final result - need to avoid duplicates while preserving previous text
              const normalizedTranscript = transcript.toLowerCase().trim();
              
              // Check if we've already added this or a similar phrase
              let isDuplicate = false;
              for (const phrase of addedPhrases) {
                if (normalizedTranscript.includes(phrase) || phrase.includes(normalizedTranscript)) {
                  isDuplicate = true;
                  break;
                }
              }
              
              if (!isDuplicate) {
                // Add this phrase to our tracking set
                addedPhrases.add(normalizedTranscript);
                
                // Add to our final text, preserving previous content
                transcriptData.finalText += (transcriptData.finalText ? ' ' : '') + transcript;
                transcriptData.interimText = '';
                
                // Combine all content - starting content + accumulated final text
                const fullText = [
                  transcriptData.startingContent,
                  transcriptData.finalText
                ].filter(Boolean).join(' ').trim();
                
                setNewMessage(fullText);
              } else {
                // Even for duplicates, we need to update the message to clear the interim text
                const fullText = [
                  transcriptData.startingContent,
                  transcriptData.finalText
                ].filter(Boolean).join(' ').trim();
                
                setNewMessage(fullText);
              }
            }
          }
        } catch (err) {
          console.error('Parsing Deepgram response error', err);
        }
      };

      socket.onerror = (err) => {
        console.error('Deepgram socket error', err);
        stopRecording();
      };

      socket.onclose = () => stopRecording();
    } catch (err) {
      console.error('Deepgram init failed:', err);
      stopRecording();
    }
  };

  // Reset and preserve state correctly when stopping recording
  const stopRecording = () => {
    if (recorderRef.current?.state === 'recording') recorderRef.current.stop();
    micStreamRef.current?.getTracks().forEach(t => t.stop());
    micStreamRef.current = null;
    if (dgSocketRef.current?.readyState === WebSocket.OPEN) {
      dgSocketRef.current.send(JSON.stringify({ type: 'CloseStream' }));
    }
    dgSocketRef.current?.close();
    dgSocketRef.current = null;
    
    // Instead of resetting all transcript data, we update the new starting point
    // for potential future recordings to include everything we have now
    
    // We don't reset the text in the input field, just the internal tracking variables
    transcriptData.startingContent = newMessage.trim(); // Preserve current complete text
    transcriptData.interimText = '';
    transcriptData.finalText = '';
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startDeepgramConnection();
    }
  };

  // Auto-resize input
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 100) + 'px';
    }
  }, [newMessage]);

  return (
    <>
      {/* Messages Container with Overlay */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-hidden relative">
        {isRecording && (
          <div className="absolute inset-0 backdrop-blur-sm flex items-center justify-center rounded-t-[20px] z-10">
            <div className="w-[100px] h-[100px]">
              <DotLottieReact
                src="https://lottie.host/bbaba2ef-5cc8-4bba-a181-acfaa0fe8722/32DGaHBRvH.lottie"
                loop
                autoplay
              />
            </div>
          </div>
        )}
        
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center text-gray-500 h-[80px]">
              No Instructions to show
            </div>
          ) : (
            messages.map((message) => (
              <div 
                key={message.id} 
                className={`relative p-4 bg-[#F6F7FF] rounded-[14px] group ${
                  message.isNew ? 'message-animate-in' : ''
                } ${deletingMessageId === message.id ? 'message-animate-out' : ''}`}
                onMouseEnter={() => setHoveredMessage(message.id)}
                onMouseLeave={() => setHoveredMessage(null)}
              >
                <div className="flex flex-col gap-2">
                  <span className="inline-flex px-2 py-1 rounded-full bg-[#717AEA14] text-[#3B3BC6] text-xs w-fit">
                    Instruction {message.number}
                  </span>
                  <div 
                    className="text-[#626262] px-2 max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: formatInstructionHtml(message.text)
                    }}
                  />
                </div>

                {hoveredMessage === message.id && (
                  <div className="absolute left-[90%] top-2 flex flex-col gap-2">
                    <div className="relative group/tooltip">
                      <button
                        onClick={() => handleEditMessage(message)}
                        className="w-7 h-7 bg-white rounded-full flex items-center justify-center shadow-md"
                      >
                        <img src="/pen.svg" alt="Edit" className="w-7 h-7" />
                      </button>
                      <div className="absolute w-[65px] left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover/tooltip:block bg-black text-white text-xs px-2 py-1 rounded">
                        Edit Info.
                      </div>
                    </div>
                    <div className="relative group/tooltip">
                      <button
                        onClick={() => handleDeleteMessage(message.id)}
                        className="w-7 h-7 rounded-full bg-white border border-gray-300 hover:bg-gray-100 flex items-center justify-center shadow-md"
                      >
                        <Trash2 className="text-indigo-400 w-4 h-4"/>
                      </button>
                      <div className="absolute left-full ml-2 top-1/2 -translate-y-1/2 hidden group-hover/tooltip:block bg-black text-white text-xs px-2 py-1 rounded">
                        Delete
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Input Section with Voice Support */}
      <div className="p-4 flex items-center  mt-1">
        <div className="relative flex-1">
          <textarea
            ref={inputRef}
            rows="1"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
              }
            }}
            placeholder="Add instructions"
            className="w-[379px] min-h-[52px] max-h-[100px] px-4 py-3 pr-12 rounded-full border-2 border-[#717AEA] focus:outline-none resize-none overflow-y-auto scrollbar-hidden"
          />
          <button 
            onClick={toggleRecording}
            className={`absolute right-2 2xl:right-6 top-[25px] -translate-y-1/2 w-8 h-8 rounded-full mb-2
              ${isRecording ? 'bg-red-100 text-red-500' : 'bg-[#717AEA1A]'}
              flex items-center justify-center transition-colors`}
          >
            <Mic className={`w-4 h-4 ${isRecording ? 'text-red-500' : 'text-[#717AEA]'}`} />
          </button>
        </div>
        
        <button 
          onClick={handleSendMessage}
          className="w-[52px] h-[52px] rounded-full flex items-center mb-2 justify-center transition-colors"
        >
          <img src="/send.svg" alt="Send" className="w-5 h-5" />
        </button>
      </div>
    </>
  );
};

export default InstructionsChat;