import {
  initialPolyppValues,
  initialTarmScreeningValues
} from "./../../components/Trees/utilities/initialValues";
import {
  polypp,
  tarmscreening
} from "../../components/Trees/utilities/tree-schema";

export const getSchemaAndInitialValues = (category: string) => {
  switch (category.toLowerCase()) {
    case "polypp":
      return { schema: polypp, initialValues: initialPolyppValues };
    case "tarmscreening":
      return { schema: tarmscreening, initialValues: initialTarmScreeningValues };
    default:
      return { schema: tarmscreening, initialValues: initialTarmScreeningValues };
  }
};
