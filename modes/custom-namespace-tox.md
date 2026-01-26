# Custom Toxicology Namespace Terms

**Namespace:** `https://w3id.org/tox/terms#`  
**Status:** Project-specific (not yet publicly registered)  
**Last Updated:** 2026-01-26

## Overview

This document tracks all custom terms used in the ISA+Toxicology RO-Crate profile that use the `tox:` prefix. These terms are currently project-specific and should be considered for future standardization or replacement with established ontology terms.

---

## Properties

### Study-Level Properties

#### hasChemical (using OBI_0000293 - TEMPORARY)
- **Current URI:** `https://purl.obolibrary.org/obo/OBI_0000293` (has_specified_input)
- **Property Name:** `hasChemical`
- **Domain:** Study
- **Range:** ChemicalSubstance
- **Description:** Links directly to ChemicalSubstance entities representing test chemicals and controls. Use CompoundCloud lookup to search by name or CAS number.
- **Usage:** Added at Study level in the "Chemical Information" input group
- **Status:** ⚠️ TEMPORARY - Currently using generic OBI_0000293 (has_specified_input). Need to research and replace with appropriate OBI term specific to chemicals.

#### hasBioSample (using OBI_0000293 - TEMPORARY)
- **Current URI:** `https://purl.obolibrary.org/obo/OBI_0000293` (has_specified_input)
- **Property Name:** `hasBioSample`
- **Domain:** Study
- **Range:** CellLine
- **Description:** Links directly to CellLine entities representing cell lines and biological models. Use Cellosaurus lookup to search catalogued cell lines.
- **Usage:** Added at Study level in the "Biological Model Information" input group
- **Status:** ⚠️ TEMPORARY - Currently using generic OBI_0000293 (has_specified_input). Need to research and replace with appropriate OBI term specific to biological samples.

### LabProcess-Level Properties

#### hasSpecifiedInput (OBI standard)
- **Full URI:** `https://purl.obolibrary.org/obo/OBI_0000293` (has_specified_input)
- **Property Name:** `hasSpecifiedInput`
- **Domain:** LabProcess
- **Range:** ChemicalSubstance, CellLine, Sample, File
- **Description:** Explicit experimental inputs to this process step. Standard OBI property for specifying process inputs.
- **Usage:** Added to LabProcess for explicit input tracking alongside schema:object
- **Status:** ✅ STANDARD OBI TERM

### LabProcess-Level Properties

#### tox:measuresAopEvent
- **Full URI:** `https://w3id.org/tox/terms#measuresAopEvent`
- **Domain:** LabProcess
- **Range:** AopEvent
- **Description:** Links a LabProcess to AOP key event(s) that the process measures or contributes evidence for.
- **Usage:** Added to LabProcess in the "Endpoint Readout Information" input group
- **Status:** Custom - Related to AOP-Wiki but custom property

---

## Classes

### tox:aopEvent
- **Full URI:** `https://w3id.org/tox/terms#aopEvent`
- **Type:** Class
- **Description:** Represents an AOP (Adverse Outcome Pathway) key event or molecular initiating event
- **Properties:**
  - `name` (preferred label)
  - `short_name` (abbreviation)
  - `description` (narrative)
  - `identifier` (URL)
  - `eventType` (key event or MIE)
- **Lookup:** aopwikiEvents module
- **Status:** Custom - Related to AOP-Wiki ontology but custom class

### tox:aopEventRelationship
- **Full URI:** `https://w3id.org/tox/terms#aopEventRelationship`
- **Type:** Class
- **Description:** Represents relationships between upstream and downstream AOP key events
- **Properties:**
  - `name` (relationship label)
  - `description` (notes)
  - `identifier` (URL)
  - `upstream_event` (upstream key event name)
  - `downstream_event` (downstream key event name)
- **Lookup:** aopwikiRelationships module
- **Status:** Custom - Related to AOP-Wiki ontology but custom class

---

## ChemicalSubstance Property Extensions

These properties extend the Bioschemas ChemicalSubstance class with toxicology-specific identifiers:

#### tox:casNumber
- **Full URI:** `https://w3id.org/tox/terms#casNumber`
- **Domain:** ChemicalSubstance
- **Range:** Text
- **Description:** CAS Registry Number(s) for the substance
- **Multiple:** Yes
- **Status:** Custom - Consider using established CAS property URIs

#### tox:pubchemCid
- **Full URI:** `https://w3id.org/tox/terms#pubchemCid`
- **Domain:** ChemicalSubstance
- **Range:** Text
- **Description:** PubChem Compound identifier
- **Status:** Custom - Consider using PubChem RDF URIs

#### tox:dsstoxId
- **Full URI:** `https://w3id.org/tox/terms#dsstoxId`
- **Domain:** ChemicalSubstance
- **Range:** Text
- **Description:** EPA DSSTOX identifier
- **Status:** Custom - Consider using DSSTox RDF URIs

#### tox:chemblId
- **Full URI:** `https://w3id.org/tox/terms#chemblId`
- **Domain:** ChemicalSubstance
- **Range:** Text
- **Description:** ChEMBL identifier
- **Status:** Custom - Consider using ChEMBL RDF URIs

#### tox:keggId
- **Full URI:** `https://w3id.org/tox/terms#keggId`
- **Domain:** ChemicalSubstance
- **Range:** Text
- **Description:** KEGG compound identifier
- **Status:** Custom - Consider using KEGG RDF URIs

#### tox:chebiId
- **Full URI:** `https://w3id.org/tox/terms#chebiId`
- **Domain:** ChemicalSubstance
- **Range:** Text
- **Description:** ChEBI identifier
- **Status:** Custom - Consider using ChEBI OBO ontology URIs

#### tox:echaInfocardId
- **Full URI:** `https://w3id.org/tox/terms#echaInfocardId`
- **Domain:** ChemicalSubstance
- **Range:** Text
- **Description:** ECHA Substance Infocard ID
- **Status:** Custom

#### tox:ecNumber
- **Full URI:** `https://w3id.org/tox/terms#ecNumber`
- **Domain:** ChemicalSubstance
- **Range:** Text
- **Description:** EC/EINECS number
- **Status:** Custom

---

## Controlled Vocabulary Terms

### Chemical Roles

#### tox:TestChemical
- **Full URI:** `https://w3id.org/tox/terms#TestChemical`
- **Type:** DefinedTerm
- **Label:** "Test chemical"
- **Description:** Role indicating this chemical is being tested
- **Status:** Custom - Consider using ChEBI chemical role terms

#### tox:PositiveControl
- **Full URI:** `https://w3id.org/tox/terms#PositiveControl`
- **Type:** DefinedTerm
- **Label:** "Positive control"
- **Description:** Role indicating this chemical is a positive control
- **Status:** Custom

#### tox:NegativeControl
- **Full URI:** `https://w3id.org/tox/terms#NegativeControl`
- **Type:** DefinedTerm
- **Label:** "Negative control"
- **Description:** Role indicating this chemical is a negative control
- **Status:** Custom

#### tox:VehicleControl
- **Full URI:** `https://w3id.org/tox/terms#VehicleControl`
- **Type:** DefinedTerm
- **Label:** "Vehicle/solvent control"
- **Description:** Role indicating this chemical is a vehicle/solvent control
- **Status:** Custom

---

## BioAssay Property Extensions

#### tox:substrate
- **Full URI:** `https://w3id.org/tox/terms#substrate`
- **Domain:** BioAssay
- **Range:** Substrate, Text
- **Description:** Substrate or reagent used in the assay (e.g., MTT, T3)
- **Status:** Custom

#### tox:incubationTime
- **Full URI:** `https://w3id.org/tox/terms#incubationTime`
- **Domain:** BioAssay
- **Range:** ParameterValue
- **Description:** Incubation time with substrate or reagent
- **Status:** Custom

---

## Recommendations

### Short-term
1. **Keep using custom namespace** - Continue using `https://w3id.org/tox/terms#` for development
2. **Document all usages** - Maintain this file with all custom terms
3. **Add to profile documentation** - Reference this file in `modes/profiles/tox.md`

### Long-term
1. **Register namespace** - Submit `https://w3id.org/tox/terms#` to W3ID for permanent resolution
2. **Map to established ontologies** - Where possible, align with:
   - **AOP-Wiki RDF** - For AOP events and relationships
   - **ChEBI** - For chemical roles
   - **BAO** - For assay-specific terms
   - **CHEMINF** - For chemical identifiers
3. **Publish vocabulary** - Create and publish a formal toxicology vocabulary specification
4. **Submit to Bioschemas** - Propose toxicology-specific extensions to Bioschemas

---

## Change Log

- **2026-01-26** - Initial documentation of custom namespace terms
  - 3 properties (hasChemical, hasBioSample, measuresAopEvent)
  - 2 classes (aopEvent, aopEventRelationship)
  - 8 ChemicalSubstance identifier properties
  - 4 chemical role terms
  - 2 BioAssay properties

---

## Contact

For questions about these custom terms or to propose standardization efforts, please contact:
- **Author:** J.M. Houweling
- **Project:** ISA+Toxicology RO-Crate Profile
- **Repository:** https://github.com/johannehouweling/crate-o-tox
