#!/usr/bin/env bash
# install.sh — Install marketing skills into your project
#
# Usage:
#   ./install.sh                         Install all skills to .agents/skills/
#   ./install.sh --skill page-cro        Install specific skill(s)
#   ./install.sh --list                  List available skills
#   ./install.sh --dir path/to/skills    Install to custom directory
#
# Or run directly without cloning:
#   curl -fsSL https://raw.githubusercontent.com/coreyhaines31/marketingskills/main/install.sh | bash

set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILLS_SOURCE="$REPO_DIR/skills"
TARGET_DIR="${PWD}/.agents/skills"
SELECTED_SKILLS=()
LIST_ONLY=false

# Parse arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --skill|--skills)
      shift
      while [[ $# -gt 0 && "$1" != --* ]]; do
        SELECTED_SKILLS+=("$1")
        shift
      done
      ;;
    --dir)
      TARGET_DIR="$2"
      shift 2
      ;;
    --list)
      LIST_ONLY=true
      shift
      ;;
    --help|-h)
      sed -n '2,9p' "${BASH_SOURCE[0]}" | sed 's/^# //'
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Run '$0 --help' for usage."
      exit 1
      ;;
  esac
done

# Collect available skills
available=()
for dir in "$SKILLS_SOURCE"/*/; do
  name="$(basename "$dir")"
  if [[ -f "$dir/SKILL.md" ]]; then
    available+=("$name")
  fi
done

# --list
if $LIST_ONLY; then
  echo ""
  echo "Available skills (${#available[@]}):"
  echo ""
  for name in "${available[@]}"; do
    echo "  $name"
  done
  echo ""
  exit 0
fi

# Validate requested skills exist
if [[ ${#SELECTED_SKILLS[@]} -gt 0 ]]; then
  for req in "${SELECTED_SKILLS[@]}"; do
    found=false
    for avail in "${available[@]}"; do
      [[ "$req" == "$avail" ]] && found=true && break
    done
    if ! $found; then
      echo "Error: skill '$req' not found."
      echo "Run '$0 --list' to see available skills."
      exit 1
    fi
  done
  to_install=("${SELECTED_SKILLS[@]}")
else
  to_install=("${available[@]}")
fi

# Install
mkdir -p "$TARGET_DIR"
echo ""
echo "Installing ${#to_install[@]} skill(s) to $TARGET_DIR/"
echo ""

installed=0
for name in "${to_install[@]}"; do
  src="$SKILLS_SOURCE/$name"
  dest="$TARGET_DIR/$name"
  cp -r "$src" "$dest"
  echo "  ✓ $name"
  installed=$((installed + 1))
done

echo ""
echo "$installed skill(s) installed."
echo ""
echo "Skills are ready in: $TARGET_DIR/"
echo "Your agent will use them automatically on the next session."
