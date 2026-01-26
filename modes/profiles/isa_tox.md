# ISA+Toxicology Extensions RO-Crate Profile

* Version: 1.0.0-draft.1
* Permalink: _coming soon_
* Authors
  * Jente Houweling - https://orcid.org/0009-0005-3680-0645
* Based on: [ISA RO-Crate Profile](./isa.md)
* **Table of contents**
  * [Overview](#overview)
  * [Requirements - Extensions to Base ISA](#requirements---extensions-to-base-isa)
    * [Study (Extensions)](#study-extensions)
    * [LabProcess (Extensions)](#labprocess-extensions)
  * [Requirements - New Toxicology Classes](#requirements---new-toxicology-classes)
    * [ChemicalSubstance](#chemicalsubstance)
    * [Supplier](#supplier)
    * [CellLine](#cellline)
    * [BioAssay](#bioassay)
    * [Endpoint](#endpoint)
    * [DetectionInstrument](#detectioninstrument)
    * [InstrumentManufacturer](#instrumentmanufacturer)
    * [AssayKit](#assaykit)
    * [MeasuredEntity](#measuredentity)
    * [Substrate](#substrate)
    * [AdverseOutcomePathway](#adverseoutcomepathway)
    * [AopEvent](#aopevent)
    * [AopEventRelationship](#aopeventrelationship)
    * [Grant](#grant)
  * [Implementation Notes](#implementation-notes)
  * [Example ro-crate-metadata.json](#example-ro-crate-metadatajson)

## Overview

This profile extends the base [ISA RO-Crate Profile](./isa.md) with toxicology-specific metadata requirements for cell-based in vitro toxicology experiments. All base ISA requirements documented in `isa.md` remain applicable. This profile adds:

**Chemical Information**: Detailed test chemical metadata with cross-database identifiers (PubChem, ChEMBL, EPA DSSTox, etc.) integrated via CompoundCloud lookup service.

**Biological Models**: Cell line information with integration to Cellosaurus for catalogued cell lines and support for custom/distributed cell lines.

**Bioassay Characterization**: Structured description of bioassay formats, detection methods, measured endpoints, and experimental conditions aligned with the BioAssay Ontology (BAO).

**Adverse Outcome Pathway (AOP) Integration**: Linkage to AOP-Wiki for documenting measured key events and connecting experimental observations to adverse outcomes.

**Enhanced Experimental Workflows**: Support for explicit specification of experimental inputs (chemicals, cell lines) and bioassay characterization at the process level.

### Namespace Prefixes

This profile uses additional namespace prefixes beyond those in the base ISA profile:

| Prefix | URI | Description |
|--------|-----|-------------|
|tox|https://w3id.org/tox/terms#|Custom toxicology vocabulary (see [custom-namespace-tox.md](../custom-namespace-tox.md))|
|bao|http://www.bioassayontology.org/bao#|BioAssay Ontology|
|mesh|http://purl.bioontology.org/ontology/MESH/|Medical Subject Headings|
|obo|http://purl.obolibrary.org/obo/|Open Biological and Biomedical Ontologies|

### Lookup Services

This profile integrates specialized lookup services for toxicology data:

* **CompoundCloud**: Chemical substance search by name or CAS number with cross-database identifier resolution
* **Cellosaurus**: Catalogued cell line search with standardized metadata
* **BAO (BioAssay Ontology)**: Bioassay types, endpoints, instruments, and measured entities
* **AOP-Wiki**: Adverse outcome pathways, key events, and event relationships

## Requirements - Extensions to Base ISA

### Study (Extensions)

These properties extend the base Study entity defined in the [ISA profile](./isa.md#study). All base Study requirements remain applicable.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|usesChemical (obo:OBI_0000293)|COULD|[ChemicalSubstance](#chemicalsubstance)|Test chemicals, controls, and vehicles used in this study. Use ChemicalSubstance lookup to search by name or CAS number. Avoid duplicate entries - reuse existing ChemicalSubstance entities when the same compound is used multiple times.|
|usesBioSample (obo:OBI_0000293)|COULD|[CellLine](#cellline)|Cell lines and biological models used in this study. Use CellLine lookup to search catalogued cell lines from Cellosaurus, or manually enter distributed but non-catalogued lines.|
|adverseOutcomePathway (mesh:D000073931)|COULD|[AdverseOutcomePathway](#adverseoutcomepathway)|Adverse Outcome Pathways (AOPs) relevant to this study. Use AOP-Wiki lookup to find and link to established AOPs.|

### LabProcess (Extensions)

These properties extend the base LabProcess entity defined in the [ISA profile](./isa.md#labprocess). All base LabProcess requirements remain applicable.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|hasSpecifiedInput (obo:OBI_0000293)|SHOULD|[ChemicalSubstance](#chemicalsubstance) or [CellLine](#cellline) or [bioschemas.org/Sample](./isa.md#sample) or [File](./isa.md#data)|Explicit experimental inputs to this process step following OBI semantics (OBI: has specified input). Use this for materials that are intentionally added as part of the experimental design, such as test chemicals, cell lines, or specific samples. Maintain parallel `schema:object` property for schema.org compatibility.|
|bioassayType (bao:BAO_0000015)|COULD|[BioAssay](#bioassay)|Type of bioassay being performed in this process (e.g., cell viability assay, enzyme activity assay, reporter gene assay). Use BAO lookup to find standardized assay type classifications.|
|measuresAopEvent (tox:measuresAopEvent)|COULD|[AopEvent](#aopevent)|AOP key event(s) that this process measures or contributes evidence for. Links experimental observations to mechanistic understanding in adverse outcome pathways. Use AOP-Wiki Events lookup.|

## Requirements - New Toxicology Classes

### ChemicalSubstance

Based on [bioschemas.org/ChemicalSubstance](https://bioschemas.org/ChemicalSubstance). Represents test chemicals, controls, vehicles, or any chemical compound used in toxicology experiments.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the chemical substance. Should be a URI when available (e.g., PubChem URI).|
|@type|MUST|Text|MUST be 'bioschemas.org/ChemicalSubstance' or 'ChemicalSubstance'|
|name|MUST|Text|Preferred chemical name. Use IUPAC name or common name as appropriate.|
|cas (tox:casNumber)|SHOULD|Text|CAS Registry Number(s) for this substance. Multiple CAS numbers may exist for substances with isomers or mixtures.|
|smiles (schema:smiles)|SHOULD|Text|Simplified Molecular-Input Line-Entry System (SMILES) string describing the molecular structure.|
|formula (schema:molecularFormula)|SHOULD|Text|Molecular formula as text (e.g., "C6H12O6").|
|mass (schema:molecularWeight)|SHOULD|Number|Molecular weight in g/mol.|
|hasRole (bao:BAO_0003102)|SHOULD|[schema.org/DefinedTerm](./isa.md#definedterm)|Role played by this chemical within the assay context. Values: Test chemical, Positive control, Negative control, Vehicle/solvent control.|
|description (schema:description)|COULD|Text|Notes on chemical selection, purity, source, or role in the experiment.|
|supplier (schema:provider)|COULD|[Supplier](#supplier)|Organization or vendor that supplied this chemical.|
|additionalProperty (schema:additionalProperty)|COULD|[schema.org/PropertyValue](./isa.md#propertyvalue)|Additional metadata such as catalog numbers, lot numbers, purity specifications, or storage conditions.|
|subclassOf (rdfs:subClassOf)|COULD|[ChemicalSubstance](#chemicalsubstance)|Higher level chemical class or family (e.g., "polycyclic aromatic hydrocarbon").|
|pubchemCid (tox:pubchemCid)|COULD|Text|PubChem Compound Identifier (CID).|
|dsstoxId (tox:dsstoxId)|COULD|Text|EPA DSSTox Substance Identifier (DTXSID).|
|chemblId (tox:chemblId)|COULD|Text|ChEMBL compound identifier.|
|keggId (tox:keggId)|COULD|Text|KEGG compound identifier.|
|chebiId (tox:chebiId)|COULD|Text|ChEBI (Chemical Entities of Biological Interest) identifier.|
|echaInfocardId (tox:echaInfocardId)|COULD|Text|ECHA (European Chemicals Agency) Substance Infocard ID.|
|ecNumber (tox:ecNumber)|COULD|Text|EC number (EINECS/ELINCS number) for regulatory identification.|

### Supplier

Based on [schema.org/Organization](https://schema.org/Organization). Represents a chemical supplier, vendor, or biological resource provider.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the supplier organization.|
|@type|MUST|Text|MUST be 'schema.org/Organization' or 'Organization'|
|name|MUST|Text|Supplier or vendor name (e.g., "Sigma-Aldrich", "ATCC").|
|address (schema:address)|COULD|Text|Free-text description of supplier location or headquarters.|
|url (schema:url)|COULD|URL|Website or catalog page for the supplier.|
|identifier (schema:identifier)|COULD|Text or URL|Identifier such as ROR ID, DUNS number, or vendor-specific ID.|

### CellLine

Based on [bioschemas.org/CellLine](https://bioschemas.org/CellLine). Represents catalogued or distributed cell lines used as biological models.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the cell line. Use Cellosaurus URI when available.|
|@type|MUST|Text|MUST be 'bioschemas.org/CellLine' or 'CellLine'|
|name|MUST|Text|Cell line name or designation. Use Cellosaurus lookup for catalogued lines (e.g., "HepG2", "MCF-7"). Manually enter for distributed but non-catalogued lines.|
|provider (schema:provider)|SHOULD|[schema.org/Organization](./isa.md#organization) or [schema.org/Person](./isa.md#person) or Text|Source or supplier of the cell line (e.g., ATCC, laboratory that provided the cells).|
|derivesFrom (schema:isBasedOn)|COULD|[CellLine](#cellline)|Reference to parent cell line or source material from which this cell line was derived or sub-cloned.|
|citation (schema:citation)|COULD|[schema.org/ScholarlyArticle](./isa.md#scholarlyarticle) or [schema.org/CreativeWork](https://schema.org/CreativeWork) or URL|Citations associated with this cell line, such as vendor datasheet, Cellosaurus entry URL, or primary publication describing the cell line establishment.|

### BioAssay

Based on [bao:BAO_0000015](http://www.bioassayontology.org/bao#BAO_0000015) (bioassay). Provides structured description of the bioassay format, methodology, and measured parameters.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the bioassay description.|
|@type|MUST|Text|MUST be 'bao:BAO_0000015' or 'BioAssay'|
|name (schema:name)|MUST|Text|BioAssay name or preferred label (e.g., "MTT cell viability assay", "Caspase-3/7 activity assay").|
|description (schema:description)|SHOULD|Text|Description of the assay format, principle, and methodology.|
|identifier (schema:identifier)|COULD|URL or Text|BAO identifier or URI if referencing a defined ontology term.|
|assayKit (bao:BAO_0002663)|COULD|[AssayKit](#assaykit)|Commercial assay kit used in this bioassay.|
|assayProtocol (bao:BAO_0002846)|COULD|[bioschemas.org/LabProtocol](./isa.md#labprotocol) or URL or [schema.org/ScholarlyArticle](./isa.md#scholarlyarticle)|The methodology/protocol document used to perform this bioassay.|
|substrate (tox:substrate)|COULD|[Substrate](#substrate) or Text|Substrate or reagent used in the assay (e.g., "MTT", "T3 hormone").|
|incubationTime (tox:incubationTime)|COULD|[PropertyValue](./isa.md#propertyvalue---parameter)|Incubation time with substrate or reagent, specified as a PropertyValue with value and unit.|
|detectionInstrument (bao:BAO_0002865)|COULD|[DetectionInstrument](#detectioninstrument)|Detection instrument used in this bioassay.|
|detectionInstrumentManufacturer (bao:BAO_0002628)|COULD|[InstrumentManufacturer](#instrumentmanufacturer)|Manufacturer of the detection instrument.|
|measuredEntity (bao:BAO_0002000)|COULD|[MeasuredEntity](#measuredentity)|The molecular entity being quantitated (e.g., ATP, formazan product, fluorescent protein).|
|endpoint (bao:BAO_0000208)|COULD|[Endpoint](#endpoint)|The endpoint or readout measured by the bioassay.|

### Endpoint

Based on [bao:BAO_0000179](http://www.bioassayontology.org/bao#BAO_0000179) (endpoint). Represents a measured endpoint or assay readout.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the endpoint.|
|@type|MUST|Text|MUST be 'bao:BAO_0000179' or 'Endpoint'|
|name (schema:name)|MUST|Text|Endpoint label (e.g., "IC50", "percent viability", "relative luminescence units").|
|description (schema:description)|COULD|Text|Endpoint definition or calculation method.|
|identifier (schema:identifier)|COULD|Text or URL|Ontology identifier or URI for standardized endpoints.|

### DetectionInstrument

Based on [bao:BAO_0000697](http://www.bioassayontology.org/bao#BAO_0000697) (detection instrument). Describes the instrument used for assay readout.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the instrument.|
|@type|MUST|Text|MUST be 'bao:BAO_0000697' or 'DetectionInstrument'|
|name (schema:name)|MUST|Text|Instrument name or model (e.g., "SpectraMax iD5", "ImageXpress Micro Confocal").|
|catalogNumber (obo:NCIT_C99286)|COULD|Text|Catalog or model number for the instrument.|
|manufacturer (schema:manufacturer)|COULD|Text or [schema.org/Organization](./isa.md#organization)|Manufacturer name or organization reference.|

### InstrumentManufacturer

Based on [bao:BAO_0002628](http://www.bioassayontology.org/bao#BAO_0002628) (instrument manufacturer). Represents the manufacturer of detection instruments.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the manufacturer.|
|@type|MUST|Text|MUST be 'bao:BAO_0002628' or 'InstrumentManufacturer'|
|name (schema:name)|MUST|Text|Manufacturer name (e.g., "Molecular Devices", "PerkinElmer").|
|url (schema:url)|COULD|URL|Link to the manufacturer website.|
|address (schema:address)|COULD|Text|Headquarters or facility address.|

### AssayKit

Based on [bao:BAO_0000248](http://www.bioassayontology.org/bao#BAO_0000248) (assay kit). Represents commercial assay kits or reagent sets.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the assay kit.|
|@type|MUST|Text|MUST be 'bao:BAO_0000248' or 'AssayKit'|
|name (schema:name)|MUST|Text|Kit name or product title (e.g., "CellTiter-Glo Luminescent Cell Viability Assay").|

### MeasuredEntity

Based on [bao:BAO_0002001](http://www.bioassayontology.org/bao#BAO_0002001) (perturbagen or measured entity). Represents the molecular entity or biomarker being measured.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the measured entity.|
|@type|MUST|Text|MUST be 'bao:BAO_0002001' or 'MeasuredEntity'|
|name (schema:name)|MUST|Text|Name of the measured entity or biomarker (e.g., "ATP", "reactive oxygen species", "caspase-3").|
|description (schema:description)|COULD|Text|Notes about what is being measured and its biological significance.|
|identifier (schema:identifier)|COULD|Text or URL|Ontology identifier for the entity (e.g., ChEBI ID, protein ID).|

### Substrate

Based on [bao:BAO_0000000](http://www.bioassayontology.org/bao#BAO_0000000) (BAO root concept). Represents substrates or reagents used in bioassays.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the substrate.|
|@type|MUST|Text|MUST be 'bao:BAO_0000000' or 'Substrate'|
|name (schema:name)|MUST|Text|Substrate name (e.g., "MTT", "luciferin", "T3").|

### AdverseOutcomePathway

Based on [mesh:D000073931](http://purl.bioontology.org/ontology/MESH/D000073931) (Adverse Outcome Pathways). Represents an AOP from AOP-Wiki linking molecular initiating events to adverse outcomes.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the AOP. Should be AOP-Wiki URI when available.|
|@type|MUST|Text|MUST be 'mesh:D000073931' or 'AdverseOutcomePathway'|
|description (schema:description)|MUST|Text|Name or title of the Adverse Outcome Pathway (e.g., "Binding to estrogen receptor leading to reproductive dysfunction").|
|hasPart (schema:hasPart)|COULD|[AopEvent](#aopevent)|Associated AOP events (key events and molecular initiating events) that comprise this pathway.|

### AopEvent

Based on [tox:aopEvent](https://w3id.org/tox/terms#aopEvent). Represents a key event or molecular initiating event in an adverse outcome pathway.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the AOP event. Should be AOP-Wiki event URI when available.|
|@type|MUST|Text|MUST be 'tox:aopEvent' or 'AopEvent'|
|name (schema:name)|MUST|Text|Preferred label for the AOP event (e.g., "Activation of Aryl hydrocarbon receptor").|
|shortName (schema:alternateName)|COULD|Text|Short label or abbreviation for the event.|
|description (schema:description)|COULD|Text|Narrative description or notes for the event.|
|identifier (schema:identifier)|COULD|URL|Identifier or persistent URL for the AOP event in AOP-Wiki.|
|eventType (schema:category)|COULD|Text|Indicates whether this is a "Key Event" or "Molecular Initiating Event".|

### AopEventRelationship

Based on [tox:aopEventRelationship](https://w3id.org/tox/terms#aopEventRelationship). Represents the relationship between two AOP events (upstream and downstream).

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the event relationship.|
|@type|MUST|Text|MUST be 'tox:aopEventRelationship' or 'AopEventRelationship'|
|name (schema:name)|MUST|Text|Label describing the relationship, typically derived from the connected events.|
|description (schema:description)|COULD|Text|Additional notes on the key event relationship and evidence.|
|identifier (schema:identifier)|COULD|URL|Identifier or URL for the relationship in AOP-Wiki.|
|upstreamEvent (schema:about)|COULD|Text|Name or identifier of the upstream key event.|
|downstreamEvent (schema:result)|COULD|Text|Name or identifier of the downstream key event.|

### Grant

Based on [schema.org/Grant](https://schema.org/Grant). Represents funding information for the research.

| Property | Required | Expected Type | Description |
|----------|----------|---------------|-------------|
|@id|MUST|Text or URL|Unique identifier for the grant.|
|@type|MUST|Text|MUST be 'schema.org/Grant' or 'Grant'|
|name (schema:name)|SHOULD|Text|Name of the grant or funding programme (e.g., "Horizon Europe", "NIH R01").|
|funder (schema:funder)|SHOULD|[schema.org/Organization](./isa.md#organization)|Funding organization or agency.|

## Implementation Notes

### OBI Term Usage

This profile uses `obo:OBI_0000293` for both chemical and biological sample associations with Study entities, and for the `hasSpecifiedInput` property on LabProcess. This OBI term ("has specified input") is semantically appropriate for experimental inputs. However, ongoing research is needed to identify more specific OBI terms for different input types (chemicals vs. biological samples). See [custom-namespace-tox.md](../custom-namespace-tox.md) for details.

### Custom Toxicology Namespace

The `tox:` namespace (https://w3id.org/tox/terms#) contains custom terms defined for this profile where standardized ontology terms are not yet available. This namespace should be considered provisional. As toxicology ontologies mature, these custom terms should be replaced with standard ontology URIs. See [custom-namespace-tox.md](../custom-namespace-tox.md) for full documentation of custom terms and their intended semantics.

### Schema.org Compatibility

When using OBI or other ontology properties, maintain parallel `schema:` properties where applicable to preserve schema.org compatibility. For example, when using `obo:OBI_0000293` (hasSpecifiedInput) on LabProcess, also include the `schema:object` property pointing to the same inputs.

### Lookup Service Integration

The Crate-O editor integrates several lookup services for this profile:

* **CompoundCloud**: Searches multiple chemical databases and returns standardized identifiers
* **Cellosaurus**: Returns cell line metadata including accession, species, cell type, and sex
* **BAO**: Searches BioAssay Ontology for assay types, endpoints, and instrumentation
* **AOP-Wiki**: Retrieves AOP pathways, events, and relationships with official identifiers

### Avoiding Duplicate Entities

When the same chemical, cell line, or bioassay is referenced multiple times in a crate:

1. Create the entity once with a descriptive `@id`
2. Reference the same `@id` from all linking properties
3. Use lookup services to identify when entities match (e.g., same CAS number, same Cellosaurus accession)

## Example ro-crate-metadata.json

A simplified example demonstrating toxicology extensions:

```json
{
  "@context": "https://w3id.org/ro/crate/1.1/context",
  "@graph": [
    {
      "@id": "ro-crate-metadata.json",
      "@type": "CreativeWork",
      "conformsTo": {"@id": "https://w3id.org/ro/crate/1.1"},
      "about": {"@id": "./"}
    },
    {
      "@id": "./",
      "@type": "Dataset",
      "additionalType": "Investigation",
      "name": "Cell Viability Study of Industrial Chemicals",
      "hasPart": [{"@id": "#study-1"}]
    },
    {
      "@id": "#study-1",
      "@type": "Dataset",
      "additionalType": "Study",
      "name": "HepG2 cytotoxicity screening",
      "obo:OBI_0000293": [
        {"@id": "#chemical-bpa"},
        {"@id": "#cellline-hepg2"}
      ]
    },
    {
      "@id": "#chemical-bpa",
      "@type": "ChemicalSubstance",
      "name": "Bisphenol A",
      "tox:casNumber": "80-05-7",
      "tox:pubchemCid": "6623",
      "bao:BAO_0003102": "Test chemical"
    },
    {
      "@id": "#cellline-hepg2",
      "@type": "CellLine",
      "name": "HepG2",
      "@id": "https://www.cellosaurus.org/CVCL_0027"
    }
  ]
}
```

For complete examples, see the [modes/examples/](../examples/) directory.
