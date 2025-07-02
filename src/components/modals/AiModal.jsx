import React, { useState } from 'react';
import { FileText, X } from 'lucide-react';
import icon from '../assets/instruction.png';
import ai from '../assets/ai.png';
const AiModal = ({ data,onClose, onSave }) => {
  const [instruction, setInstruction] = useState(''); // Manage instruction input
  // console.log(data);
  const handleSave = () => {
    onSave(instruction); // Pass the instruction to the parent on save
    onClose(); // Close the modal after saving
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md flex justify-center items-center z-50">
      <div className="bg-white rounded-[33px] w-[1100px] p-[28px] relative shadow-xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl"
        >
          <X className="w-6 h-6" />
        </button>

        {/* Title */}
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="bg-[#EFF4FE] text-indigo-600 rounded-full w-10 h-10 flex items-center justify-center text-[24px]">
            <img src={ai} alt="Instruction Icon" className="w-6 h-6" />
          </span>
          AI analysis marked as {data?.type}
        </h2>


        <div className='bg-[#ECF2FF] p-[16px] rounded-[12px] mb-[15px]'>
          {data &&(
            <React.Fragment >
          {data.type === 'Operation' ? (
            <>
              <div className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]">
            {/* <div className="flex gap-2 mb-1">
              <span className="font-medium">{index+1}.</span>
              <span className="text-black-700 font-semibold">{data.type}</span>
            </div> */}

              <ul className=" rounded-md p-2 mt-1 text-black list-disc list-inside">
                <li>Checkpoint: {data.cp}</li>
                <li>Operation: {data.op}</li>
                <li>Expected: {data.exp}</li>
                <li>Actual: {data.act.toFixed(4)}</li>
                <li>Deviation (sec): {data.dev_sec.toFixed(4)}</li>
                <li>Operation ID: {data.OpID}</li>
              </ul>
              
              </div>

            </>
          ) : data.type === 'Time Event' ? (
            <>
            <div className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]">
            {/* <div className="flex gap-2 mb-1">
              <span className="font-medium">{index+1}.</span>
              <span className="text-black-700 font-semibold">{data.type}</span>
            </div> */}

              <p>{data.reason}</p>
              
              </div>
            </>
          ) : data.type === 'Checkpoint' ? (
            <>
            <div className="text-sm bg-white pt-[9px] rounded-[10px] pb-[9px] pl-[7px] pr-[7px]">
            

            <ul className="rounded-md p-2 mt-1 text-black list-disc list-inside">
          {/* Extra section as a list item */}
          <li>
            <span className="font-medium">Extra:</span>
            <ul className="list-disc list-inside ml-4 mt-1">
      {data.extra.length > 0 ? (
        data.extra.map((cp, i) => (
          <li key={`extra-${i}`}>{cp}</li>
        ))
      ) : (
        <li>N/A</li>
      )}
    </ul>
          </li>

          {/* Order section as a list item */}
          <li>
            <span className="font-medium">Order:</span>
            <div className="flex flex-wrap items-center ml-5 mt-1">
              {data.order.map((cp, i) => (
                <React.Fragment key={`order-${i}`}>
                  <span>{cp}</span>
                  {i !== data.order.length - 1 && <span className="mx-1">→</span>}
                </React.Fragment>
              ))}
            </div>
          </li>

          {/* Current Anomaly section as a list item */}
          <li>
            <span className="font-medium">Current Anomaly:</span>
            <ul className="list-disc list-inside ml-4 mt-1">
              <li>Position: {data.current_anomaly.position}</li>
              <li>Expected: {data.current_anomaly.expected}</li>
              <li>Actual: {data.current_anomaly.actual}</li>
            </ul>
          </li>
        </ul>
              

             
              </div>
            </>
          ) : null}
        </React.Fragment>
          )}
        
        </div>

        <div className="bg-blue-50 rounded-lg p-6 mb-[20px]">
        <p className="text-gray-800 mb-6">Help us know why this is not an anomaly for better results!</p>
        
        {/* Instruction input field */}
        <div className='bg-white'>
          <div className="mb-2">
            <input
              type="text"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Instruction"
              className="w-full p-2 border-b border-gray-300 bg-transparent focus:outline-none focus:border-blue-500"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault(); // Optional: prevent form submission
                  handleSave();
                }
              }}
            />
          </div>
        </div>
      </div>
        {/* Footer Buttons */}
        <div className="flex justify-between items-center">
          <button
            onClick={onClose}
            className="pt-[11.35px] pb-[11.35px] pr-[15px] pl-[15px] rounded-[6.49px] text-[13px] text-black-600 border-[0.81px] border border-[#E1E1E1]"
          >
            Discard & Close
          </button>
          <button
            className="bg-[#717AEA] text-white text-[13px] px-6 py-2 rounded-md"
            onClick={handleSave} // Call handleSave on button click
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default AiModal;
