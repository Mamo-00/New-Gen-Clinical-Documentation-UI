// src/context/TemplateContext.tsx
import React, { createContext, useContext, useState, useEffect } from "react";

export interface TemplateData {
  text: string;
  category: string;
}

interface TemplateContextType {
  selectedTemplate: TemplateData | null;
  setSelectedTemplate: (template: TemplateData | null) => void;
}

const TemplateContext = createContext<TemplateContextType | undefined>(undefined);

export const TemplateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  
  // Add debug logging for template updates
  const setTemplateWithLog = (template: TemplateData | null) => {
    /* console.log("TemplateContext: Setting new template", {
      category: template?.category,
      text: template?.text ? 
        template.text.substring(0, 50) + (template.text.length > 50 ? '...' : '') 
        : null
    }); */
    setSelectedTemplate(template);
  };
  
  // Add an effect to track template changes
  /* useEffect(() => {
    if (selectedTemplate) {
      console.log("TemplateContext: Template changed", {
        category: selectedTemplate.category,
        textLength: selectedTemplate.text.length,
        firstChars: selectedTemplate.text.substring(0, 50) + '...'
      });
    }
  }, [selectedTemplate]); */
  
  return (
    <TemplateContext.Provider value={{ selectedTemplate, setSelectedTemplate: setTemplateWithLog }}>
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
