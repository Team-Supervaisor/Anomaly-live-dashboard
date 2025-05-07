import React, { useEffect, useState, useRef } from 'react';
import { X, Mic } from 'lucide-react';
import icon from '../assets/instruction.png';

const InstructionModal = ({ onClose, onSave, data }) => {
  const editorRef = useRef(null);
  const [formats, setFormats] = useState({
    bold: false,
    italic: false,
    bullet: false,
  });
  const [isRecording, setIsRecording] = useState(false);
  const recognitionRef = useRef(null);

  // -----------------------
  // Convert markdown → HTML
  // -----------------------
  const markupToHtml = (markup) => {
    if (!markup) return '';
    let html = markup
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    const lines = html.split('\n');
    let result = '';
    let inUl = false;

    lines.forEach((line) => {
      if (/^- /.test(line)) {
        if (!inUl) {
          result += '<ul>';
          inUl = true;
        }
        result += `<li>${line.replace(/^- /, '')}</li>`;
      } else {
        if (inUl) {
          result += '</ul>';
          inUl = false;
        }
        result += `<p>${line || '<br/>'}</p>`;
      }
    });
    if (inUl) result += '</ul>';
    return result;
  };

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = markupToHtml(data);
      editorRef.current.focus();
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [data]);


  useEffect(() => {
    const updateFormats = () => {
      setFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        bullet: document.queryCommandState('insertUnorderedList'),
      });
    };
    document.addEventListener('selectionchange', updateFormats);
    return () => document.removeEventListener('selectionchange', updateFormats);
  }, []);

  const applyFormat = (cmd) => {
    document.execCommand(cmd, false, null);
    editorRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand(e.shiftKey ? 'outdent' : 'indent');
    }
  };


  useEffect(() => {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recog = new SpeechRecognition();
    recog.continuous = true;
    recog.interimResults = true;
    recog.lang = 'en-US';
    let finalTranscript = '';

    recog.onresult = (evt) => {
      let interimTranscript = '';
      for (let i = evt.resultIndex; i < evt.results.length; i++) {
        const result = evt.results[i];
        const text = result[0].transcript;
        if (result.isFinal) {
          finalTranscript += text + ' ';
        } else {
          interimTranscript += text;
        }
      }
      const combined = (finalTranscript + interimTranscript).trim();
      if (editorRef.current) {
        editorRef.current.innerText = combined;
        // Move cursor to end
        const range = document.createRange();
        range.selectNodeContents(editorRef.current);
        range.collapse(false);
        const sel = window.getSelection();
        sel.removeAllRanges();
        sel.addRange(range);
      }
    };

    recognitionRef.current = recog;
  }, []);


  const toggleRecording = () => {
    if (!recognitionRef.current) return;
    if (isRecording) {
      recognitionRef.current.stop();
      setIsRecording(false);
    } else {
      recognitionRef.current.start();
      setIsRecording(true);
    }
    editorRef.current.focus();
  };

  const htmlToMarkup = (html) => {
    const container = document.createElement('div');
    container.innerHTML = html;
    let markup = '';

    const recurse = (node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        markup += node.textContent;
      } else if (node.nodeName === 'UL') {
        node.childNodes.forEach(recurse);
      } else if (node.nodeName === 'LI') {
        markup += '- ';
        node.childNodes.forEach(recurse);
        markup += '\n';
      } else if (node.nodeName === 'STRONG') {
        markup += `**${node.textContent}**`;
      } else if (node.nodeName === 'EM') {
        markup += `*${node.textContent}*`;
      } else {
        node.childNodes.forEach(recurse);
        if (['DIV', 'P', 'BR'].includes(node.nodeName)) markup += '\n';
      }
    };

    container.childNodes.forEach(recurse);
    return markup.trim();
  };

  const handleSave = () => {
    const rawHtml = editorRef.current.innerHTML;
    const markdown = htmlToMarkup(rawHtml);
    onSave(markdown);
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md flex justify-center items-center z-50">
      <div className="bg-white rounded-[33px] w-[1100px] p-[28px] relative shadow-xl flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
        >
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-600 rounded-full w-7 h-7 flex items-center justify-center">
            <img src={icon} alt="Instruction Icon" className="w-6 h-6" />
          </span>
          Instructions
        </h2>

        <div className="flex space-x-2 mb-3">
          <button
            onClick={() => applyFormat('bold')}
            className={`px-3 py-1 font-bold border rounded ${
              formats.bold ? 'bg-[#717AEA] text-white' : ''
            }`}
          >
            B
          </button>
          <button
            onClick={() => applyFormat('italic')}
            className={`px-3 py-1 italic border rounded ${
              formats.italic ? 'bg-[#717AEA] text-white' : ''
            }`}
          >
            I
          </button>
          <button
            onClick={() => applyFormat('insertUnorderedList')}
            className={`px-3 py-1 border rounded ${
              formats.bullet ? 'bg-[#717AEA] text-white' : ''
            }`}
          >
            •
          </button>
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="h-[300px] overflow-y-auto bg-transparent border border-gray-300 focus:outline-none p-4 rounded"
          onKeyDown={handleKeyDown}
        />

        <div className="mt-4 flex justify-between items-center space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E1E1E1] rounded text-[13px]"
          >
            Discard &amp; Close
          </button>

          {/* Voice button */}
          <button
            onClick={toggleRecording}
            className={`px-4 py-2 border rounded flex items-center space-x-1 ${
              isRecording
                ? 'animate-pulse border-red-500 text-red-500'
                : ''
            }`}
            title={isRecording ? 'Stop Recording' : 'Voice'}
          >
            <Mic className="w-5 h-5" />
            <span className="text-[13px]">
              {isRecording ? 'Stop' : 'Voice'}
            </span>
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2 bg-[#717AEA] text-white rounded text-[13px]"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default InstructionModal;
