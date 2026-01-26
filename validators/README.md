# ISA RO-Crate Validator

A standards-based validator for ISA (Investigation-Study-Assay) RO-Crates using the [roc-validator](https://pypi.org/project/roc-validator/) Python package and SHACL (Shapes Constraint Language).

## Overview

This validator checks RO-Crate metadata files against the **ISA profile** to ensure they conform to the Investigation-Study-Assay data model. It uses:

- **[roc-validator](https://pypi.org/project/roc-validator/)**: Official RO-Crate validation package from PyPI
- **SHACL**: W3C standard for defining validation rules
- **ISA Profile**: Based on the [ISA RO-Crate Profile v1.0.0-draft.1](https://github.com/nfdi4plants/isa-ro-crate-profile)

## Installation

### Prerequisites

- Python 3.8 or higher
- pip

### Install Dependencies

```bash
# From the validators directory
cd validators
pip install -r requirements.txt
```

This will install:
- `roc-validator>=0.9.0` - The official RO-Crate validator

## Usage

### Basic Validation

```bash
python isa_validator.py --crate path/to/ro-crate-metadata.json
```

### Verbose Output (includes warnings)

```bash
python isa_validator.py --crate my-crate.json --verbose
```

### JSON Output (for automation)

```bash
python isa_validator.py --crate my-crate.json --output json > results.json
```

### Custom Profile

```bash
python isa_validator.py --crate my-crate.json --profile custom_isa_profile.ttl
```

### Short Options

```bash
python isa_validator.py -c test-data/sydney/ro-crate-metadata.json -v
```

## Command Line Options

| Option | Short | Description |
|--------|-------|-------------|
| `--crate PATH` | `-c` | **Required.** Path to ro-crate-metadata.json file |
| `--profile PATH` | `-p` | Path to custom ISA SHACL profile (default: profiles/isa_profile.ttl) |
| `--output FORMAT` | `-o` | Output format: `text` (default) or `json` |
| `--verbose` | `-v` | Show detailed output including warnings |
| `--version` | | Show version information |
| `--help` | `-h` | Show help message |

## Output Examples

### Valid Crate

```
======================================================================
ISA RO-Crate Validation Report
======================================================================
Crate: test-data/sydney/ro-crate-metadata.json
Profile: ISA (Investigation-Study-Assay)

✅ Status: VALID ISA CRATE

The RO-Crate conforms to the ISA profile!
======================================================================
```

### Invalid Crate

```
======================================================================
ISA RO-Crate Validation Report
======================================================================
Crate: my-crate.json
Profile: ISA (Investigation-Study-Assay)

❌ Status: INVALID ISA CRATE

Violations (3):
----------------------------------------------------------------------
1. Violation: Investigation MUST have an identifier
   Focus Node: ./
   Property: https://schema.org/identifier

2. Violation: Investigation MUST have a name (title)
   Focus Node: ./
   Property: https://schema.org/name

3. Violation: Study MUST have an identifier
   Focus Node: #study_001
   Property: https://schema.org/identifier

======================================================================
```

## ISA Profile Validation Rules

The validator checks for compliance with the ISA RO-Crate profile, which defines:

### Investigation (MUST have)
- `@type`: "Dataset"
- `additionalType`: "Investigation"
- `identifier`: Unique identifier
- `name`: Title
- `description`: Abstract/description
- `license`: License information
- `datePublished`: Publication date

### Study (MUST have)
- `@type`: "Dataset"
- `additionalType`: "Study"
- `identifier`: Unique identifier
- `name`: Title

### Assay (MUST have)
- `@type`: "Dataset"
- `additionalType`: "Assay"
- `identifier`: Unique identifier

### Supporting Entities

The profile also validates:
- **LabProcess**: Experimental processes
- **LabProtocol**: Protocols used
- **Sample**: Biological samples/materials
- **Person**: Researchers and contributors
- **ScholarlyArticle**: Publications
- **DefinedTerm**: Ontology annotations
- **PropertyValue**: Parameters, characteristics, factors

See `modes/profiles/isa.md` for complete profile documentation.

## ISA Profile (SHACL)

The validation rules are defined in `profiles/isa_profile.ttl` using SHACL (Shapes Constraint Language), a W3C standard for validating RDF graphs.

### Key Features

✅ **Standards-Based**: Uses W3C SHACL standard  
✅ **Machine-Readable**: Profile is formally defined  
✅ **Reusable**: Can be used with other SHACL validators  
✅ **Extensible**: Easy to add new rules  
✅ **Severity Levels**: Distinguishes between MUST (violations) and SHOULD (warnings)

### Profile Structure

```turtle
@prefix sh: <http://www.w3.org/ns/shacl#> .
@prefix schema: <https://schema.org/> .
@prefix bioschemas: <https://bioschemas.org/> .

# Example: Investigation Shape
isa:InvestigationShape
    a sh:NodeShape ;
    sh:targetClass schema:Dataset ;
    sh:property [
        sh:path schema:identifier ;
        sh:minCount 1 ;
        sh:message "Investigation MUST have an identifier" ;
    ] .
```

## Exit Codes

The validator returns standard exit codes:

- `0`: Validation passed (crate is valid)
- `1`: Validation failed (crate is invalid or error occurred)

This makes it suitable for CI/CD pipelines:

```bash
python isa_validator.py --crate my-crate.json && echo "Valid!" || echo "Invalid!"
```

## Integration Examples

### In a Shell Script

```bash
#!/bin/bash
CRATE_FILE="ro-crate-metadata.json"

if python validators/isa_validator.py --crate "$CRATE_FILE"; then
    echo "ISA validation passed"
    # Continue with processing...
else
    echo "ISA validation failed"
    exit 1
fi
```

### In Python

```python
from validators.isa_validator import ISAValidator

validator = ISAValidator()
result = validator.validate("ro-crate-metadata.json")

if result["valid"]:
    print("Valid ISA crate!")
else:
    print("Invalid ISA crate")
    for violation in result["violations"]:
        print(f"- {violation['message']}")
```

### In CI/CD (GitHub Actions)

```yaml
- name: Validate ISA RO-Crate
  run: |
    pip install -r validators/requirements.txt
    python validators/isa_validator.py --crate ro-crate-metadata.json
```

## Testing with Example Data

The project includes test data in the `test-data/` directory:

```bash
# Test against Sydney example
python validators/isa_validator.py --crate test-data/sydney/ro-crate-metadata.json -v

# Test against Cooee example
python validators/isa_validator.py --crate test-data/cooee/ro-crate-metadata.json -v

# Test against empty crate
python validators/isa_validator.py --crate test-data/empty/ro-crate-metadata.json -v
```

## Troubleshooting

### roc-validator not found

```
Error: roc-validator package not installed.
```

**Solution**: Install dependencies:
```bash
pip install -r requirements.txt
```

### Profile not found

```
Error: Profile not found: profiles/isa_profile.ttl
```

**Solution**: Ensure you're running the script from the correct directory, or provide the full path:
```bash
python /full/path/to/validators/isa_validator.py --crate my-crate.json
```

### Python version error

The validator requires Python 3.8+. Check your version:
```bash
python --version
```

## Development

### Modifying the ISA Profile

To add or modify validation rules, edit `profiles/isa_profile.ttl`:

1. Define new shapes using SHACL syntax
2. Add property constraints with `sh:property`
3. Set severity: `sh:Violation` (default) or `sh:Warning`
4. Provide clear error messages with `sh:message`

Example:
```turtle
isa:MyCustomShape
    a sh:NodeShape ;
    sh:targetClass schema:MyType ;
    sh:property [
        sh:path schema:myProperty ;
        sh:minCount 1 ;
        sh:message "MyType MUST have myProperty" ;
    ] .
```

### Testing Changes

After modifying the profile, test it:

```bash
python isa_validator.py --crate test-data/sydney/ro-crate-metadata.json --verbose
```

## Resources

- **ISA Profile Documentation**: [modes/profiles/isa.md](../modes/profiles/isa.md)
- **roc-validator on PyPI**: https://pypi.org/project/roc-validator/
- **SHACL Specification**: https://www.w3.org/TR/shacl/
- **RO-Crate**: https://www.researchobject.org/ro-crate/
- **ISA Tools**: https://isa-tools.org/

## Version

ISA Validator 1.0.0  
ISA Profile: 1.0.0-draft.1  
Based on: [nfdi4plants/isa-ro-crate-profile](https://github.com/nfdi4plants/isa-ro-crate-profile)

## License

This validator is part of the crate-o-tox project. See the main LICENSE file for details.
