#!/bin/bash
cd /home/kavia/workspace/code-generation/planet-tracker-47118-47128/planet_tracker_frontend
npm run build
EXIT_CODE=$?
if [ $EXIT_CODE -ne 0 ]; then
   exit 1
fi

