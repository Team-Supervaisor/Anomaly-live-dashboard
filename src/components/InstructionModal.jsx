import React, { useEffect, useState, useRef } from 'react';
import { X } from 'lucide-react';
import icon from '../assets/instruction.png';

const InstructionModal = ({ onClose, onSave, data }) => {
  const editorRef = useRef(null);
  const [formats, setFormats] = useState({ bold: false, italic: false, bullet: false, ordered: false });

  const markupToHtml = (markup) => {
    if (!markup) return '';
    let html = markup
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>');
    const lines = html.split('\n');
    let result = '';
    let inUl = false;
    let inOl = false;

    lines.forEach(line => {
      if (/^- /.test(line)) {
        if (!inUl) { result += '<ul>'; inUl = true; }
        result += `<li>${line.replace(/^- /, '')}</li>`;
      } else if (/^\d+\. /.test(line)) {
        if (!inOl) { result += '<ol>'; inOl = true; }
        result += `<li>${line.replace(/^\d+\. /, '')}</li>`;
      } else {
        if (inUl) { result += '</ul>'; inUl = false; }
        if (inOl) { result += '</ol>'; inOl = false; }
        result += `<p>${line || '<br/>'}</p>`;
      }
    });
    if (inUl) result += '</ul>';
    if (inOl) result += '</ol>';
    return result;
  };


  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerHTML = markupToHtml(data);
      editorRef.current.focus();
      // Place cursor at end
      const range = document.createRange();
      range.selectNodeContents(editorRef.current);
      range.collapse(false);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }
  }, [data]);

  // Track toolbar state
  useEffect(() => {
    const updateFormats = () => {
      setFormats({
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        bullet: document.queryCommandState('insertUnorderedList'),
        ordered: document.queryCommandState('insertOrderedList'),
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

  const htmlToMarkup = (html) => {
    const container = document.createElement('div');
    container.innerHTML = html;
    let markup = '';
    let olCounters = [];

    const recurse = (node, depth = 0) => {
      if (node.nodeType === Node.TEXT_NODE) {
        markup += node.textContent;
      } else if (/^(STRONG|B)$/.test(node.nodeName)) {
        markup += `**${node.textContent}**`;
      } else if (/^(EM|I)$/.test(node.nodeName)) {
        markup += `*${node.textContent}*`;
      } else if (node.nodeName === 'UL') {
        node.childNodes.forEach(li => recurse(li, depth));
      } else if (node.nodeName === 'OL') {
        olCounters[depth] = 1;
        node.childNodes.forEach(li => recurse(li, depth));
        olCounters.pop();
      } else if (node.nodeName === 'LI') {
        const prefix = node.parentNode.nodeName === 'OL'
          ? `${olCounters[depth]++}. `
          : '- ';
        markup += prefix;
        node.childNodes.forEach(child => recurse(child, depth + 1));
        markup += '\n';
      } else if (['DIV', 'P', 'BR'].includes(node.nodeName)) {
        node.childNodes.forEach(child => recurse(child, depth));
        if (node.nodeName !== 'BR') markup += '\n';
      } else {
        node.childNodes.forEach(child => recurse(child, depth));
      }
    };

    container.childNodes.forEach(node => recurse(node, 0));
    return markup.trim();
  };

  const handleSave = () => {
    const rawHtml = editorRef.current.innerHTML;
    const markup = htmlToMarkup(rawHtml);
    onSave(markup);
    onClose();
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md flex justify-center items-center z-50">
      <div className="bg-white rounded-[33px] w-[1100px] p-[28px] relative shadow-xl flex flex-col">
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-gray-600">
          <X className="w-6 h-6" />
        </button>
        <h2 className="text-xl font-semibold mb-2 flex items-center gap-2">
          <span className="bg-indigo-100 text-indigo-600 rounded-full w-7 h-7 flex items-center justify-center">
            <img src={icon} alt="Instruction Icon" className="w-6 h-6" />
          </span>
          Instructions
        </h2>

        <div className="flex space-x-2 mb-3">
          <button onClick={() => applyFormat('bold')} className={`px-3 py-1 font-bold border rounded ${formats.bold ? 'bg-[#717AEA] text-white' : ''}`} title="Bold">B</button>
          <button onClick={() => applyFormat('italic')} className={`px-3 py-1 italic border rounded ${formats.italic ? 'bg-[#717AEA] text-white' : ''}`} title="Italic">I</button>
          <button onClick={() => applyFormat('insertUnorderedList')} className={`px-3 py-1 border rounded ${formats.bullet ? 'bg-[#717AEA] text-white' : ''}`} title="Bullet List">•</button>
          {/* <button onClick={() => applyFormat('insertOrderedList')} className={`px-3 py-1 border rounded ${formats.ordered ? 'bg-[#717AEA] text-white' : ''}`} title="Numbered List">1.</button> */}
        </div>

        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          className="h-[300px] overflow-y-auto bg-transparent border border-gray-300 focus:outline-none p-4 rounded"
          onKeyDown={handleKeyDown}
        />

        <div className="mt-4 flex justify-between">
          <button onClick={onClose} className="px-4 py-2 border border-[#E1E1E1] rounded text-[13px] text-black">Discard & Close</button>
          <button onClick={handleSave} className="px-6 py-2 bg-[#717AEA] text-white rounded text-[13px]">Save</button>
        </div>
      </div>
    </div>
  );
};

export default InstructionModal;
