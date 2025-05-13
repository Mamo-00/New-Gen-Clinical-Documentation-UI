export interface MikroskopiPanelField {
  id: string;
  label: string;
  type: 'dropdown' | 'checkbox' | 'checkboxGroup' | 'number' | 'text';
  options?: string[];
  defaultValue: any;
  generatesText?: string;
  conditionalOn?: string;
  conditionalValue?: any;
  conditionalValue_not?: any;
  unit?: string;
  helpText?: string;
  panelId: string;
}
