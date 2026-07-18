#!/bin/bash

# Exit immediately if a command exits with a non-zero status
set -e

echo "============================================="
echo "   TalentFlow Setup & Launch Script (Linux)  "
echo "============================================="

# 1. Check prerequisites
echo "Checking system prerequisites..."
if ! [ -x "$(command -v node)" ]; then
  echo 'Error: node is not installed. Please install Node.js first.' >&2
  exit 1
fi
if ! [ -x "$(command -v npm)" ]; then
  echo 'Error: npm is not installed. Please install npm first.' >&2
  exit 1
fi

# 2. Install dependencies
echo "Installing server dependencies..."
cd server
npm install
cd ..

echo "Installing client dependencies..."
cd client
npm install
cd ..

echo "Dependencies successfully installed!"
echo "---------------------------------------------"

# Disable exit on error for startup phase
set +e

# 3. Starting the processes
echo "Starting backend server..."
cd server
npm run dev > backend.log 2>&1 &
BACKEND_PID=$!
echo "Backend started (PID: $BACKEND_PID, logs -> server/backend.log)"
cd ..

echo "Starting frontend client..."
cd client
npm run dev > frontend.log 2>&1 &
FRONTEND_PID=$!
echo "Frontend started (PID: $FRONTEND_PID, logs -> client/frontend.log)"
cd ..

echo "---------------------------------------------"
echo "TalentFlow is now launching!"
echo "  - Backend Port: 5000"
echo "  - Frontend Port: 5173 (or next available)"
echo "To view logs, run:"
echo "  tail -f server/backend.log"
echo "  tail -f client/frontend.log"
echo ""
echo "To stop both processes, run:"
echo "  kill $BACKEND_PID $FRONTEND_PID"
echo "============================================="

# Keep script running to monitor PIDs
wait $BACKEND_PID $FRONTEND_PID
