#!/usr/bin/env python3
"""
TV Power Control via Python CEC library
Usage: python3 tv-control-python.py [on|off|status]
"""

import cec
import sys
import time

def main():
    command = sys.argv[1] if len(sys.argv) > 1 else "status"

    # Initialize CEC
    cec.init()
    time.sleep(1)  # Give CEC time to initialize

    # Get TV device (address 0)
    tv = cec.Device(cec.CECDEVICE_TV)

    if command == "on":
        print("Turning TV ON...")
        tv.power_on()
        print("TV ON command sent")
    elif command == "off":
        print("Turning TV OFF...")
        tv.standby()
        print("TV OFF command sent")
    elif command == "status":
        print("Checking TV status...")
        power_status = tv.power_status
        print(f"TV power status: {power_status}")
    else:
        print(f"Usage: {sys.argv[0]} {{on|off|status}}")
        sys.exit(1)

if __name__ == "__main__":
    main()
