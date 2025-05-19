import React from 'react';
import { Trash2 } from 'lucide-react';

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
  return (
    <>
      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 scrollbar-hidden">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="flex items-center justify-center h-full text-gray-500">
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

      {/* Input Section */}
      <div className="p-4 flex items-center gap-3 mt-1">
        <div className="relative flex-1">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Add instructions"
            className="w-[379px] h-[52px] px-4 pr-12 rounded-full border-2 border-[#717AEA] focus:outline-none"
          />
          <button 
            className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-[#717AEA1A] flex items-center justify-center"
          >
            <img src="/mic.svg" alt="Voice Input" className="w-4 h-4" />
          </button>
        </div>
        
        <button 
          onClick={handleSendMessage}
          className="w-[52px] h-[52px] rounded-full flex items-center justify-center transition-colors"
        >
          <img src="/send.svg" alt="Send" className="w-5 h-5" />
        </button>
      </div>
    </>
  );
};

export default InstructionsChat;