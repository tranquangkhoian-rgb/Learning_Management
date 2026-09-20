#!/bin/bash
cd "$(dirname "$0")"
echo "Starting LMS Server on http://localhost:8080 ..."
python3 server.py
