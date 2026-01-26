#!/usr/bin/env python3
"""
ISA RO-Crate Validator

Validates RO-Crate metadata files against the ISA (Investigation-Study-Assay) profile
using the roc-validator package and SHACL shapes.

Usage:
    python isa_validator.py --crate path/to/ro-crate-metadata.json
    python isa_validator.py --crate my-crate.json --verbose
    python isa_validator.py --crate my-crate.json --output json
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Dict, Any, Tuple, List

try:
    from rocrate_validator.services import validate
    from rocrate_validator.models import ValidationSettings
    from rdflib import Graph, Namespace
    from rdflib.namespace import RDF
    from pyshacl import validate as shacl_validate
except ImportError:
    print("Error: roc-validator package not installed.")
    print("Please install it using: pip install roc-validator")
    print("Or install from requirements.txt: pip install -r requirements.txt")
    sys.exit(1)


class ISAValidator:
    """Validator for ISA RO-Crates"""
    
    def __init__(self, profile_path: str = None):
        """Initialize the validator with an ISA profile path"""
        if profile_path is None:
            # Default to the ISA profile in the profiles directory
            script_dir = Path(__file__).parent
            profile_path = script_dir / "profiles" / "isa_profile.ttl"
        
        self.profile_path = Path(profile_path)
        
        if not self.profile_path.exists():
            raise FileNotFoundError(f"Profile not found: {self.profile_path}")
    
    def validate(self, crate_path: str) -> Dict[str, Any]:
        """
        Validate an RO-Crate against the ISA profile
        
        Args:
            crate_path: Path to the ro-crate-metadata.json file
            
        Returns:
            Dictionary with validation results
        """
        crate_path = Path(crate_path)
        
        if not crate_path.exists():
            return {
                "valid": False,
                "error": f"Crate file not found: {crate_path}",
                "violations": []
            }
        
        try:
            rocrate_result = self._validate_rocrate(crate_path.parent)
            isa_result = self._validate_isa(crate_path, self.profile_path)

            overall_valid = rocrate_result["valid"] and isa_result["valid"]

            return {
                "valid": overall_valid,
                "rocrate": rocrate_result,
                "isa": isa_result,
                "violations": isa_result.get("violations", []),
                "warnings": isa_result.get("warnings", [])
            }

        except Exception as e:
            return {
                "valid": False,
                "error": f"Validation error: {str(e)}",
                "violations": []
            }

    def _validate_rocrate(self, crate_dir: Path) -> Dict[str, Any]:
        """Validate the RO-Crate structure using roc-validator"""
        settings = ValidationSettings(
            data_path=crate_dir,
            profile_identifier="ro-crate-1.1"
        )
        result = validate(settings)

        issues = []
        for issue in result.issues:
            issues.append({
                "severity": issue.severity.name,
                "message": issue.message,
                "focusNode": issue.focusNode,
                "path": issue.resultPath
            })

        return {
            "valid": result.passed(),
            "issues": issues
        }

    def _validate_isa(self, crate_path: Path, profile_path: Path) -> Dict[str, Any]:
        """Validate the metadata graph against ISA SHACL shapes"""
        data_graph = Graph()
        data_graph.parse(str(crate_path), format="json-ld")

        shacl_graph = Graph()
        shacl_graph.parse(str(profile_path), format="turtle")

        conforms, results_graph, _ = shacl_validate(
            data_graph=data_graph,
            shacl_graph=shacl_graph,
            inference="rdfs",
            abort_on_first=False,
            allow_infos=True,
            allow_warnings=True
        )

        violations, warnings = self._parse_shacl_results(results_graph)

        return {
            "valid": bool(conforms),
            "violations": violations,
            "warnings": warnings
        }

    def _parse_shacl_results(self, results_graph: Graph) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """Parse SHACL validation results into violations and warnings"""
        sh = Namespace("http://www.w3.org/ns/shacl#")
        violations: List[Dict[str, Any]] = []
        warnings: List[Dict[str, Any]] = []

        for result_node in results_graph.subjects(RDF.type, sh.ValidationResult):
            severity_node = results_graph.value(result_node, sh.resultSeverity)
            message_node = results_graph.value(result_node, sh.resultMessage)
            focus_node = results_graph.value(result_node, sh.focusNode)
            path_node = results_graph.value(result_node, sh.resultPath)

            severity = str(severity_node) if severity_node else "Violation"
            message = str(message_node) if message_node else "Validation failed"

            item = {
                "severity": severity,
                "message": message,
                "focusNode": str(focus_node) if focus_node else None,
                "path": str(path_node) if path_node else None
            }

            if severity.endswith("Warning"):
                warnings.append(item)
            elif severity.endswith("Info"):
                warnings.append(item)
            else:
                violations.append(item)

        return violations, warnings


def format_output_text(result: Dict[str, Any], crate_path: str, verbose: bool = False) -> str:
    """Format validation results as human-readable text"""
    lines = []
    lines.append("=" * 70)
    lines.append("ISA RO-Crate Validation Report")
    lines.append("=" * 70)
    lines.append(f"Crate: {crate_path}")
    lines.append(f"Profile: ISA (Investigation-Study-Assay)")
    lines.append("")
    
    if "error" in result:
        lines.append(f"❌ ERROR: {result['error']}")
        lines.append("")
        return "\n".join(lines)
    
    if result["valid"]:
        lines.append("✅ Status: VALID ISA CRATE")
        lines.append("")
        lines.append("The RO-Crate conforms to the ISA profile!")
        
        if verbose and result.get("warnings"):
            lines.append("")
            lines.append(f"Warnings ({len(result['warnings'])}):")
            lines.append("-" * 70)
            for i, warning in enumerate(result["warnings"], 1):
                lines.append(f"{i}. {warning['message']}")
                if warning.get('focusNode'):
                    lines.append(f"   Focus Node: {warning['focusNode']}")
                if warning.get('path'):
                    lines.append(f"   Property: {warning['path']}")
                lines.append("")
    else:
        lines.append("❌ Status: INVALID ISA CRATE")
        lines.append("")
        
        violations = result.get("violations", [])
        if violations:
            lines.append(f"Violations ({len(violations)}):")
            lines.append("-" * 70)
            for i, violation in enumerate(violations, 1):
                lines.append(f"{i}. {violation.get('severity', 'Error')}: {violation['message']}")
                if violation.get('focusNode'):
                    lines.append(f"   Focus Node: {violation['focusNode']}")
                if violation.get('path'):
                    lines.append(f"   Property: {violation['path']}")
                lines.append("")
        
        if verbose and result.get("warnings"):
            lines.append(f"Warnings ({len(result['warnings'])}):")
            lines.append("-" * 70)
            for i, warning in enumerate(result["warnings"], 1):
                lines.append(f"{i}. {warning['message']}")
                if warning.get('focusNode'):
                    lines.append(f"   Focus Node: {warning['focusNode']}")
                if warning.get('path'):
                    lines.append(f"   Property: {warning['path']}")
                lines.append("")
    
    rocrate = result.get("rocrate")
    if rocrate:
        lines.append("")
        lines.append("RO-Crate Profile Check (ro-crate-1.1):")
        lines.append("-" * 70)
        lines.append(f"Status: {'PASS' if rocrate.get('valid') else 'FAIL'}")
        if verbose and rocrate.get("issues"):
            lines.append(f"Issues ({len(rocrate['issues'])}):")
            for i, issue in enumerate(rocrate["issues"], 1):
                lines.append(f"{i}. {issue['severity']}: {issue['message']}")
                if issue.get("focusNode"):
                    lines.append(f"   Focus Node: {issue['focusNode']}")
                if issue.get("path"):
                    lines.append(f"   Property: {issue['path']}")
                lines.append("")

    lines.append("=" * 70)
    return "\n".join(lines)


def main():
    """Main entry point for the validator"""
    parser = argparse.ArgumentParser(
        description="Validate RO-Crate metadata against the ISA profile",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s --crate ro-crate-metadata.json
  %(prog)s --crate my-crate.json --verbose
  %(prog)s --crate my-crate.json --output json > results.json
  %(prog)s -c test-data/sydney/ro-crate-metadata.json -v
        """
    )
    
    parser.add_argument(
        "--crate", "-c",
        required=True,
        help="Path to the ro-crate-metadata.json file to validate"
    )
    
    parser.add_argument(
        "--profile", "-p",
        help="Path to a custom ISA profile (SHACL .ttl file). If not provided, uses the default ISA profile."
    )
    
    parser.add_argument(
        "--output", "-o",
        choices=["text", "json"],
        default="text",
        help="Output format (default: text)"
    )
    
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Show detailed output including warnings"
    )
    
    parser.add_argument(
        "--version",
        action="version",
        version="ISA Validator 1.0.0"
    )
    
    args = parser.parse_args()
    
    # Create validator
    try:
        validator = ISAValidator(profile_path=args.profile)
    except FileNotFoundError as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)
    
    # Validate the crate
    result = validator.validate(args.crate)
    
    # Output results
    if args.output == "json":
        print(json.dumps(result, indent=2))
    else:
        print(format_output_text(result, args.crate, args.verbose))
    
    # Exit with appropriate code
    sys.exit(0 if result.get("valid", False) else 1)


if __name__ == "__main__":
    main()
