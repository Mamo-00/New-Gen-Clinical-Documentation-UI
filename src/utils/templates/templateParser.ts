import { TemplateField } from './../../components/Trees/interfaces/iTemplateField';
import { FieldValue } from "../../components/Trees/utilities/treeTypes";

/**
 * Extract values from a template string based on known patterns and category.
 * The function uses the schema's id as a category identifier:
 * - "glass": Extract dimensions (2D/3D) and glass identifier.
 * - "hudbit": Extract measurements and variant.
 * - "traadvev": Extract a measurement and optionally other fields.
 * - "polypp": Extract overall and specific measurements.
 *
 * @param template - The raw template text with placeholders.
 * @param schema - The template schema (can be used for future extensions).
 * @param category - Category identifier ("glass", "hudbit", "traadvev", "polypp").
 * @returns A record with field names as keys and parsed values.
 */
export function extractValuesFromTemplate(
  template: string,
  schema: TemplateField,
  category: string
): Record<string, FieldValue> {
  let values: Record<string, FieldValue> = {};

  switch (category) {
    case "glass": {
      // Look for 3D dimensions first: e.g., "12x15x20mm"
      const dimensionRegex3D = /(\d+)[xX](\d+)[xX](\d+)\s*mm/;
      // Then look for 2D dimensions: e.g., "12x15mm"
      const dimensionRegex2D = /(\d+)[xX](\d+)\s*mm/;
      const match3D = template.match(dimensionRegex3D);
      if (match3D) {
        values["hoyde"] = Number(match3D[1]);   // Height
        values["bredde"] = Number(match3D[2]);   // Width
        values["lengde"] = Number(match3D[3]);   // Length
      } else {
        const match2D = template.match(dimensionRegex2D);
        if (match2D) {
          values["bredde"] = Number(match2D[1]); // Width
          values["lengde"] = Number(match2D[2]); // Length
        }
      }
      // Optionally extract glass identifier, e.g. "Glass: XYZ"
      const glassValueRegex = /Glass:\s*(\S+)/i;
      const glassMatch = template.match(glassValueRegex);
      if (glassMatch) {
        values["glassValue"] = glassMatch[1];
      }
      break;
    }
    case "hudbit": {
      // For hudbit, extract measurements and variant.
      // E.g., "Måling1: 12mm" for primaryMeasurement and "Måling2: 8mm" for lesjonMeasurement.
      const primaryRegex = /Måling1:\s*(\d+)\s*mm/i;
      const lesjonRegex = /Måling2:\s*(\d+)\s*mm/i;
      const primaryMatch = template.match(primaryRegex);
      if (primaryMatch) {
        values["primaryMeasurement"] = Number(primaryMatch[1]);
      }
      const lesjonMatch = template.match(lesjonRegex);
      if (lesjonMatch) {
        values["lesjonMeasurement"] = Number(lesjonMatch[1]);
      }
      // Extract variant if provided e.g. "Variant: Hudbit"
      const variantRegex = /Variant:\s*(\w+)/i;
      const variantMatch = template.match(variantRegex);
      if (variantMatch) {
        values["variant"] = variantMatch[1];
      }
      break;
    }
    case "traadvev": {
      // For trådvev, sample extraction: extract a generic measurement.
      const measurementRegex = /Measurement:\s*(\d+)/i;
      const measurementMatch = template.match(measurementRegex);
      if (measurementMatch) {
        values["measurement"] = Number(measurementMatch[1]);
      }
      // Extend with additional trådvev-specific parsing as needed.
      break;
    }
    case "polypp": {
      // For polypp, extract overall measurement and specific parts.
      const overallRegex = /Overall:\s*(\d+)\s*mm/i;
      const headRegex = /PolyppHead:\s*(\d+)\s*mm/i;
      const stilkRegex = /Stilk:\s*(\d+)\s*mm/i;
      const overallMatch = template.match(overallRegex);
      if (overallMatch) {
        values["overallMeasurement"] = Number(overallMatch[1]);
      }
      const headMatch = template.match(headRegex);
      if (headMatch) {
        values["polyppHeadMeasurement"] = Number(headMatch[1]);
      }
      const stilkMatch = template.match(stilkRegex);
      if (stilkMatch) {
        values["stilkMeasurement"] = Number(stilkMatch[1]);
      }
      // Additional polypp fields can be added similarly.
      break;
    }
    default:
      // No extraction logic; return an empty object.
      break;
  }
  return values;
}
