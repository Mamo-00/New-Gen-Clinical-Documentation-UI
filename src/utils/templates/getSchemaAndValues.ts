import {
  initialPolyppValues,
  initialGlassValues,
  initialTarmScreeningValues
} from "./../../components/Trees/utilities/initialValues";
import {
  glass,
  polypp,
  tarmscreening
} from "../../components/Trees/utilities/tree-schema";

export const getSchemaAndInitialValues = (category: string) => {
  switch (category.toLowerCase()) {
    case "glass":
      return { schema: glass, initialValues: initialGlassValues };
    case "polypp":
      return { schema: polypp, initialValues: initialPolyppValues };
    case "tarmscreening":
      return { schema: tarmscreening, initialValues: initialTarmScreeningValues };
    default:
      return { schema: glass, initialValues: initialGlassValues };
  }
};
