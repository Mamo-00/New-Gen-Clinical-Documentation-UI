// src/context/TemplateContext.tsx
import React, { createContext, useContext, useState } from "react";

export interface TemplateData {
  text: string;
  originalText: string;
  category: string;
  timestamp: number;
}

interface TemplateContextType {
  selectedTemplate: TemplateData | null;
  setSelectedTemplate: (template: TemplateData | null) => void;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const TemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  
  const setTemplate= (template: TemplateData | null) => {
    // Ensure originalText is always set when a new template is selected
    const updatedTemplate = template ? {
      ...template,
      originalText: template.originalText || template.text,
      timestamp: new Date().getTime() // Add a timestamp to force state update
    } : null;
    
    setSelectedTemplate(updatedTemplate);
  };
  
  return (
    <TemplateContext.Provider value={{ selectedTemplate, setSelectedTemplate: setTemplate }}>
      {children}
    </TemplateContext.Provider>
  );
};

export const useTemplate = () => {
  const context = useContext(TemplateContext);
  if (!context) {
    throw new Error("useTemplate must be used within a TemplateProvider");
  }
  return context;
};
