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
  
  // Initial values for polypp schema - updated to match simplified structure
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
    glassCount: 1,
    additionalNotes: ""
  };

  // Initial values for tarmscreening schema
  export const initialTarmScreeningValues: Record<string, FieldValue> = {
    glassCount: 1,
    grynCount: 2,
    vevsbitCount: 2,
    proveType: "Polypp",
    lokalisasjon: "Colon sigmoideum",
    lesjonsUtseende: "Polypoid",
    storrelse: 0,
    storrelse2: 0,
    lengde: 0,
    bredde: 0,
    hoyde: 0,
    lengde1: 0,
    bredde1: 0,
    hoyde1: 0,
    lengde2: 0,
    bredde2: 0,
    hoyde2: 0,
    lengde3: 0,
    bredde3: 0,
    hoyde3: 0,
    lengde4: 0,
    bredde4: 0,
    hoyde4: 0,
    polyppHeadMeasurement: 0,
    stilkMeasurement: 0,
    fragMeasurementA: 0,
    fragMeasurementB: 0, 
    fragMeasurementC: 0,
    niceKlassifikasjon: "NICE 2",
    komplett: true,
  };