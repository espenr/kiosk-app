#!/bin/bash
#
# Refresh the TV browser (send Ctrl+F5 for hard refresh)
#

echo "Sending hard refresh to TV browser..."
ssh pi@pi.local 'DISPLAY=:0 xdotool key --clearmodifiers ctrl+F5'
echo "Done!"
