import * as monaco from 'monaco-editor';

export const conditionTerms = [
  "diabetes", "hypertension", "asthma", "anemia", "chronic", "cardiac", 
  "gastrointestinal", "rheumatoid", "vascular", "tachycardia", "osteoporosis",
  "bronchitis", "lymphatic", "neurological", "myocardial infarction", 
  "renal", "hypotension"
];

export const procedureTerms = [
  "blood test", "MRI scan", "X-ray", "surgery", "echocardiogram", 
  "electrocardiogram", "palpitations", "diagnosis", "prognosis"
];

export const medicationTerms = [
  "paracetamol", "ibuprofen", "metformin", "insulin", "cholesterol"
];

export const shorthandTerms = [
  "BP", "HR", "RR", "SpO2"
];

export const complexMedicalTerms = [
  {
    label: "insulin",
    insertText: "insulin (dose: ${1:10} IU)",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
  },
  {
    label: "insulin",
    insertText: "insulin (dose: 10 IU)",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
  },
  {
    label: "insulin",
    insertText: "insulin (dose: 20 IU)",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
  },
  {
    label: "BP",
    insertText: "BP (Blood Pressure: ${1:120/80})",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
  },
  {
    label: "MRI Scan",
    insertText: "MRI scan scheduled on ${1:date}",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
  },
  {
    label: "Paracetamol",
    insertText: "Paracetamol 500mg",
    insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet
  }
];

export const bracketKeywords = ["critical", "warning", "info"];