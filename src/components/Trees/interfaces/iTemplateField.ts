import { FieldValue } from "../utilities/treeTypes";
//schema template
export interface TemplateField {
    id: string;
    label?: string;
    type: "container" | "text" | "number" | "checkbox" | "dropdown";
    countField?: number;
    defaultValue?: FieldValue;
    unit?: string;
    options?: string[]; // For dropdown fields
    optional?: boolean;
    conditionalOn?: string; // id of the field that controls this field's display
    conditionalValue?: string[] | number[] | boolean[] | FieldValue; // value that triggers display
    children?: TemplateField[];
    helpText?: string;
    layout?: string;
    isIndented?: boolean;
    excluded?: boolean; // Used to mark fields that should be excluded from rendering
  }