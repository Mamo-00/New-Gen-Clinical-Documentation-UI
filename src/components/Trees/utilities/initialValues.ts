import { FieldValue } from "./treeTypes";

// Initial values for glass schema
export const initialGlassValues: Record<string, FieldValue> = {
    countField: 1,
    glassValue: "",
    blokker: 1,
    hoyde: 0,
    bredde: 0,
    lengde: 0,
    utseende: "annet",
    orientert: true,
    oppdelt: false,
    oppdeltNumber: 0,
  };
  
  // Initial values for hudbit schema
  export const initialHudbitValues: Record<string, FieldValue> = {
    countField: 1,
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
    countField: 1,
    vevsbiterCount: 2,
    measurement: 1,
    distribution: "fordeles i #1 og #2",
    segment1Count: 1,
    segment1Measurement: 1,
    segment2Count: 1,
    segment2Measurement: 1,
    colorInfo: "ABPAS",
    fragmented: false,
  };
  
  // Initial values for polypp schema
  export const initialPolyppValues: Record<string, FieldValue> = {
    countField: 1,
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