#!/usr/bin/env python3
"""
On Brand Crew - CLI entry point.

Usage:
    on-brand-crew check "Your content here" --profile ./brand-profile.json
    on-brand-crew check --file content.txt --profile ./brand-profile.json
    on-brand-crew batch --dir ./content/ --profile ./brand-profile.json
    on-brand-crew serve --profile ./brand-profile.json --port 3001
"""

import argparse
import json
import sys
from pathlib import Path
from typing import Optional

from on_brand_crew.crew import SimpleBrandChecker, OnBrandCrew


def check_content(
    content: str,
    profile_path: str,
    content_type: Optional[str] = None,
    use_crew: bool = False,
    output_json: bool = False,
) -> int:
    """
    Check content for brand consistency.

    Returns exit code: 0 for on-brand, 1 for off-brand, 2 for errors.
    """
    try:
        if use_crew:
            crew = OnBrandCrew(profile_path)
            result = crew.check(content, content_type=content_type)
        else:
            checker = SimpleBrandChecker(profile_path)
            result = checker.check(content, content_type=content_type)

        if "error" in result:
            print(f"Error: {result['error']}", file=sys.stderr)
            return 2

        if output_json:
            print(json.dumps(result, indent=2, default=str))
        else:
            print()
            print("─" * 50)
            print(f"  {result['statusDisplay']}")
            print("─" * 50)
            print()
            print("Explanation:")
            for exp in result.get("explanations", []):
                severity = exp.get("severity", "info")
                icon = "❌" if severity == "critical" else "⚠️" if severity == "warning" else "ℹ️"
                print(f"  {icon} {exp['text']}")

            if result.get("confidence") is not None:
                print(f"\nConfidence: {result['confidence']}%")

            print(f"Profile: v{result.get('profileVersion', 'unknown')}")
            print()

        # Return exit code based on status
        status = result.get("status", "")
        if status == "off-brand":
            return 1
        return 0

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2


def check_batch(
    content_dir: str,
    profile_path: str,
    output_json: bool = False,
) -> int:
    """Check all text files in a directory."""
    try:
        checker = SimpleBrandChecker(profile_path)
        dir_path = Path(content_dir)

        if not dir_path.exists():
            print(f"Error: Directory not found: {content_dir}", file=sys.stderr)
            return 2

        # Find all text files
        files = list(dir_path.glob("*.txt")) + list(dir_path.glob("*.md"))
        if not files:
            print(f"No .txt or .md files found in {content_dir}")
            return 0

        results = []
        for file_path in sorted(files):
            content = file_path.read_text()
            result = checker.check(content)
            result["file"] = str(file_path)
            results.append(result)

        summary = checker.get_summary(results)

        if output_json:
            print(json.dumps({
                "results": results,
                "summary": summary,
            }, indent=2, default=str))
        else:
            print(f"\n📊 Brand Check Results ({summary['total']} files)\n")

            for result in results:
                status_icon = {
                    "on-brand": "✅",
                    "borderline": "⚠️",
                    "off-brand": "❌",
                }.get(result.get("status", ""), "?")
                print(f"  {status_icon} {result['file']}")

            print()
            print("─" * 40)
            print(f"Summary: ✅ {summary['on_brand']} | ⚠️ {summary['borderline']} | ❌ {summary['off_brand']}")
            print(f"Brand Health Score: {summary['health_score']}%")

            if summary["needs_attention"]:
                print(f"\n⚠️  {len(summary['needs_attention'])} file(s) need attention")

            print()

        return 1 if summary["off_brand"] > 0 else 0

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 2


def run_server(profile_path: str, port: int, host: str) -> None:
    """Run a simple HTTP server for brand checking."""
    try:
        from http.server import HTTPServer, BaseHTTPRequestHandler
        import json as json_module

        checker = SimpleBrandChecker(profile_path)

        class BrandCheckHandler(BaseHTTPRequestHandler):
            def do_OPTIONS(self):
                self.send_response(204)
                self.send_header("Access-Control-Allow-Origin", "*")
                self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
                self.send_header("Access-Control-Allow-Headers", "Content-Type")
                self.end_headers()

            def do_GET(self):
                if self.path == "/health":
                    self.send_response(200)
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(json_module.dumps({
                        "status": "ok",
                        "engine": "crewai"
                    }).encode())
                else:
                    self.send_response(404)
                    self.end_headers()

            def do_POST(self):
                if self.path == "/on-brand/check":
                    content_length = int(self.headers.get("Content-Length", 0))
                    body = self.rfile.read(content_length).decode()

                    try:
                        data = json_module.loads(body)
                        content = data.get("content", "")
                        content_type = data.get("contentType")

                        result = checker.check(content, content_type)

                        self.send_response(200)
                        self.send_header("Content-Type", "application/json")
                        self.send_header("Access-Control-Allow-Origin", "*")
                        self.end_headers()
                        self.wfile.write(json_module.dumps(result, default=str).encode())

                    except json_module.JSONDecodeError:
                        self.send_response(400)
                        self.send_header("Content-Type", "application/json")
                        self.end_headers()
                        self.wfile.write(json_module.dumps({
                            "error": "Invalid JSON"
                        }).encode())
                else:
                    self.send_response(404)
                    self.end_headers()

            def log_message(self, format, *args):
                status = args[1] if len(args) > 1 else ""
                if "200" in str(status):
                    print(f"✅ {args[0]}")
                else:
                    print(f"📝 {args[0]}")

        server = HTTPServer((host, port), BrandCheckHandler)
        print(f"\n🚀 On Brand Crew Server (CrewAI) running at http://{host}:{port}")
        print("\nEndpoints:")
        print(f"  POST http://{host}:{port}/on-brand/check")
        print(f"  GET  http://{host}:{port}/health")
        print("\nPress Ctrl+C to stop\n")
        server.serve_forever()

    except KeyboardInterrupt:
        print("\nServer stopped.")
    except Exception as e:
        print(f"Error starting server: {e}", file=sys.stderr)
        sys.exit(2)


def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(
        description="On Brand Crew - Brand consistency checking with CrewAI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Check content directly
  on-brand-crew check "Your marketing copy here" -p ./brand-profile.json

  # Check content from file
  on-brand-crew check -f content.txt -p ./brand-profile.json

  # Batch check all files in a directory
  on-brand-crew batch -d ./content/ -p ./brand-profile.json

  # Start API server
  on-brand-crew serve -p ./brand-profile.json --port 3001
        """,
    )

    subparsers = parser.add_subparsers(dest="command", required=True)

    # Check command
    check_parser = subparsers.add_parser("check", help="Check content for brand consistency")
    check_parser.add_argument("content", nargs="?", help="Content to check")
    check_parser.add_argument("-f", "--file", help="Read content from file")
    check_parser.add_argument(
        "-p", "--profile",
        default="./brand-profile.json",
        help="Path to brand profile (default: ./brand-profile.json)"
    )
    check_parser.add_argument("-t", "--type", help="Content type hint")
    check_parser.add_argument("--crew", action="store_true", help="Use full CrewAI crew (slower)")
    check_parser.add_argument("--json", action="store_true", help="Output as JSON")

    # Batch command
    batch_parser = subparsers.add_parser("batch", help="Check multiple files")
    batch_parser.add_argument(
        "-d", "--dir",
        required=True,
        help="Directory containing content files"
    )
    batch_parser.add_argument(
        "-p", "--profile",
        default="./brand-profile.json",
        help="Path to brand profile"
    )
    batch_parser.add_argument("--json", action="store_true", help="Output as JSON")

    # Serve command
    serve_parser = subparsers.add_parser("serve", help="Start API server")
    serve_parser.add_argument(
        "-p", "--profile",
        default="./brand-profile.json",
        help="Path to brand profile"
    )
    serve_parser.add_argument("--port", type=int, default=3001, help="Server port (default: 3001)")
    serve_parser.add_argument("--host", default="localhost", help="Server host (default: localhost)")

    args = parser.parse_args()

    if args.command == "check":
        # Get content
        if args.file:
            path = Path(args.file)
            if not path.exists():
                print(f"Error: File not found: {args.file}", file=sys.stderr)
                sys.exit(2)
            content = path.read_text()
        elif args.content:
            content = args.content
        else:
            print("Error: Please provide content or use --file", file=sys.stderr)
            sys.exit(2)

        exit_code = check_content(
            content=content,
            profile_path=args.profile,
            content_type=args.type,
            use_crew=args.crew,
            output_json=args.json,
        )
        sys.exit(exit_code)

    elif args.command == "batch":
        exit_code = check_batch(
            content_dir=args.dir,
            profile_path=args.profile,
            output_json=args.json,
        )
        sys.exit(exit_code)

    elif args.command == "serve":
        run_server(
            profile_path=args.profile,
            port=args.port,
            host=args.host,
        )


if __name__ == "__main__":
    main()
