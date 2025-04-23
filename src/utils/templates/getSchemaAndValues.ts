import {
  initialPolyppValues,
  initialGlassValues,
  initialHudbitValues,
  initialTraadvevValues,
} from "./../../components/Trees/utilities/initialValues";
import {
  glass,
  hudbit,
  traadvev,
  polypp,
} from "../../components/Trees/utilities/tree-schema";

export const getSchemaAndInitialValues = (category: string) => {
  switch (category.toLowerCase()) {
    case "glass":
      return { schema: glass, initialValues: initialGlassValues };
    case "hudbit":
      return { schema: hudbit, initialValues: initialHudbitValues };
    case "traadvev":
      return { schema: traadvev, initialValues: initialTraadvevValues };
    case "polypp":
      return { schema: polypp, initialValues: initialPolyppValues };
    default:
      return { schema: glass, initialValues: initialGlassValues };
  }
};
