#!/usr/bin/env bash
# Stages the vendored Retriever module and the populated ChromaDB into the
# build context, then `fly deploy`. Run from rag-service/.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
PERSONAL_RAG="${PERSONAL_RAG_DIR:-/mnt/c/Users/Usuario/personal-rag}"

if [ ! -d "$PERSONAL_RAG/src" ]; then
  echo "personal-rag not found at $PERSONAL_RAG. Set PERSONAL_RAG_DIR." >&2
  exit 1
fi

echo "Staging retriever module..."
rm -rf "$HERE/rag"
mkdir -p "$HERE/rag"
cp "$PERSONAL_RAG/src/__init__.py" "$HERE/rag/__init__.py" 2>/dev/null || : > "$HERE/rag/__init__.py"
cp "$PERSONAL_RAG/src/retriever.py" "$HERE/rag/retriever.py"

echo "Staging embeddings..."
rm -rf "$HERE/embeddings"
cp -r "$PERSONAL_RAG/embeddings" "$HERE/embeddings"

echo "Done. Build context ready. Run: fly deploy"
