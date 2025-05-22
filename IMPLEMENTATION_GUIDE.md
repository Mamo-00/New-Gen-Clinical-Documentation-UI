# Implementation Guide: Simplified Laboratory Information System

This guide explains the simplified version of the laboratory information system with a focus on tarmscreening and polypp samples.

## Overview

The system has been simplified to focus specifically on tarmscreening and polypp samples, making it more user-friendly and easier to navigate. Key components include:

1. **Templates**: Pre-defined text templates for macro descriptions
2. **Tree View**: A hierarchical view that corresponds to placeholders in templates
3. **Stepper**: A step-by-step interface for generating mikroskopisk descriptions
4. **Autocomplete**: Context-aware term suggestions

## Templates

### Polypp Templates

Four simplified templates are available for polypp descriptions:

1. **POLY_1.txt**: Complete template with multiple samples
2. **POLY_2.txt**: Simple template for a basic polypp
3. **POLY_3.txt**: Template specific for stilket polypp
4. **POLY_4.txt**: Template specific for fragmentert polypp

### Tarmscreening Templates

Two templates are available for tarmscreening descriptions:

1. **TARM_1.txt**: Full template with glass count
2. **TARM_2.txt**: Simplified template without glass count

## Tree View

The tree view has been simplified to include only relevant fields:

### Polypp Tree
- Polypp Type (dropdown: Lav/bredbaset, Stilket, Fragmentert)
- Overordnet Måling (number)
- Fordeling (dropdown: seriesnittes i #1, etc.)
- Stilket Detaljer (conditionally shown)
  - Polypphodet (number)
  - Stilk (number)
- Fragment Detaljer (conditionally shown)
  - Fragment Målinger
    - Måling A, B, C (number)
- Antall Glass (number)
- Ekstra Notater (text)

### Tarmscreening Tree
- Prøvetype (dropdown: Biopsi, Polyppektomi, Resektat)
- Lokalisasjon (dropdown: anatomical locations)
- Lesjonsutseende (dropdown: Polypoid, Flat, etc.)
- Størrelse (number)
- Komplett fjernet (checkbox)
- NICE klassifikasjon (dropdown: NICE 1, NICE 2, NICE 3)

## Stepper Interface

The stepper interface has been simplified to include only the most relevant panels:

1. **Generelle Funn**
   - Lesjonstype
   - Kjertelmønster
   - Overflateepitel

2. **Dysplastiske Funn**
   - Dysplasi til stede
   - Dysplasigrad
   - Kjernemorfologi

3. **Sagtakkede Funn**
   - Sagtakket lesjon
   - Type sagtakket lesjon
   - Sagtakking til kryptbasis

4. **Adenomfunn**
   - Adenom
   - Adenomtype

5. **Inflammasjon**
   - Inflammasjon til stede
   - Intensitet av betennelse

6. **Invasive Funn**
   - Mistanke om invasiv vekst
   - Differensieringsgrad
   - Lymfovaskulær invasjon

## Autocomplete Terms

The autocomplete terms have been focused on tarmscreening and polypp samples with relevant terms prioritized by boost value:

- High boost (10): polypp, adenom, tubulært adenom, etc.
- Medium boost (8): anatomical terms like colon, rektum, cøcum
- Lower boost (7): specialized terms like pseudostratifisert sylinderepitel

## Examples

The system includes multiple examples of tarmscreening and polypp samples to help users understand the expected format and content. These examples cover various scenarios:

- Bredbaset polypper
- Stilket polypper
- Fragmenterte polypper
- Biopsier
- Polypper with dysplasi
- Hyperplastiske polypper
- Adenokarsinomer

## Using the System

1. **Select Template**: Choose an appropriate template based on the sample type
2. **Fill Tree View**: Use the tree view to fill in the placeholders in the template
3. **Navigate Steps**: Use the stepper to generate a microscopic description
4. **Edit Text**: Fine-tune the generated text with the editor
5. **Generate Diagnosis**: Either write or use AI to generate a diagnosis based on macroscopic and microscopic descriptions

This simplified approach focuses on the most common and important elements for tarmscreening and polypp samples, making the system more accessible and efficient. 