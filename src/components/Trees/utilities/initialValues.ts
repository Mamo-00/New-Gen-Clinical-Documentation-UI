import { FieldValue } from "./treeTypes";

// Initial values for glass schema
export const initialGlassValues: Record<string, FieldValue> = {
    glassValue: "",
    blokker: "#1",
    hoyde: 4,
    bredde: 1,
    lengde: 0,
    utseende: "stilket",
    orientert: true,
    oppdelt: false,
    oppdeltNumber: 0,
  };
  
  // Initial values for hudbit schema
  export const initialHudbitValues: Record<string, FieldValue> = {
    variant: "Hudbit",
    primaryMeasurement: 0,
    lesjonDescription: "Velavgrenset",
    lesjonMeasurement: 0,
    segmentationType: "todeles",
    segmentCount: 1,
    tusjes: false,
    arrMeasurement: 0,
  };
  
  // Initial values for traadvev schema
  export const initialTraadvevValues: Record<string, FieldValue> = {
    vevsbiterCount: 0,
    measurement: 0,
    distribution: "i #1",
    segment1Count: 0,
    segment1Measurement: 0,
    segment2Count: 0,
    segment2Measurement: 0,
    colorInfo: "",
    fragmented: false,
  };
  
  // Initial values for polypp schema
  export const initialPolyppValues: Record<string, FieldValue> = {
    polyppType: "Lav, bredbaset",
    overallMeasurement: 0,
    distribution: "seriesnittes i #1",
    polyppHeadMeasurement: 0,
    stilkMeasurement: 0,
    fragMeasurementA: 0,
    fragMeasurementB: 0,
    fragMeasurementC: 0,
    fragmentSegmentation: "ingen",
    additionalNotes: "",
  };