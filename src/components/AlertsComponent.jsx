import React, { createContext, useContext, useState, useCallback, useRef } from "react";
import { XCircle, CheckCircle, Info, X } from "lucide-react";

const AlertContext = createContext();

export function useAlert() {
  return useContext(AlertContext);
}


const alertStyles = {
  error: "bg-white border border-red-200 text-red-700 shadow-lg",
  success: "bg-white border border-green-200 text-green-700 shadow-lg",
  info: "bg-white border border-blue-200 text-blue-700 shadow-lg",
};

const alertIcons = {
  error: <XCircle className="w-5 h-5 text-red-400 mr-2" />,
  success: <CheckCircle className="w-5 h-5 text-green-400 mr-2" />,
  info: <Info className="w-5 h-5 text-blue-400 mr-2" />,
};

export function AlertProvider({ children }) {
  const [alert, setAlert] = useState(null);
  const timeoutRef = useRef();

  const showAlert = useCallback((message, type = "info") => {
    setAlert({ message, type });
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setAlert(null), 3500);
  }, []);

  const handleClose = () => {
    setAlert(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
  };

  return (
    <AlertContext.Provider value={{ showAlert }}>
      {children}
      <div
        aria-live="polite"
        aria-atomic="true"
        className="pointer-events-none"
      >
        {alert && (
          <div
            role="alert"
            className={`
              fixed top-8 left-1/2 transform -translate-x-1/2 z-50
              min-w-[320px] max-w-[90vw] flex items-center gap-2
              px-5 py-3 rounded-2xl font-medium
              backdrop-blur-md transition-all duration-300
              opacity-100 pointer-events-auto
              ${alertStyles[alert.type] || alertStyles.info}
            `}
            style={{
              fontFamily: "Urbanist, sans-serif",
              boxShadow: "0 8px 32px 0 rgba(31, 38, 135, 0.10)",
              borderWidth: "1.5px",
            }}
          >
            {alertIcons[alert.type] || alertIcons.info}
            <span className="flex-1">{alert.message}</span>
            <button
              onClick={handleClose}
              className="ml-2 rounded-full p-1 hover:bg-gray-100 transition-colors"
              aria-label="Close alert"
              tabIndex={0}
              type="button"
            >
              <X className="w-4 h-4 text-gray-400" />
            </button>
          </div>
        )}
      </div>
    </AlertContext.Provider>
  );
}