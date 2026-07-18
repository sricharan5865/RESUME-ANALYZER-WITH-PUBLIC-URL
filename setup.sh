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

# 2. Install Linux System Prerequisites (Tesseract OCR & Python pip)
echo "Checking and installing Linux system packages..."
if [ -x "$(command -v apt-get)" ]; then
  echo "Debian/Ubuntu detected. Installing Tesseract-OCR, system headers, and python3-pip..."
  sudo apt-get update
  sudo apt-get install -y tesseract-ocr libtesseract-dev python3-pip python3-venv
else
  echo "Warning: apt-get not found. Skipping system package installs. Please ensure Tesseract-OCR and python3-pip are installed manually."
fi

# 3. Install Python Dependencies for OCR Fallback
echo "Installing Python OCR extension packages..."
if [ -x "$(command -v pip3)" ]; then
  # Install standard extensions. Use --break-system-packages if python 3.11+ environment forces it
  pip3 install opencv-python-headless numpy pytesseract PyMuPDF || \
  pip3 install opencv-python-headless numpy pytesseract PyMuPDF --break-system-packages || \
  echo "Warning: Failed to install python packages via pip3. Please install opencv-python-headless, numpy, pytesseract, and PyMuPDF manually."
else
  echo "Error: pip3 is not installed. Python OCR packages could not be installed."
fi

# 4. Install Node.js Dependencies
echo "Installing backend Node.js extensions..."
cd server
npm install
cd ..

echo "Installing frontend Node.js extensions..."
cd client
npm install
cd ..

echo "All extensions and dependencies successfully installed!"
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
