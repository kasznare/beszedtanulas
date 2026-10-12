"""Compatibility entry point for the fixed Jessa audiobook workflow.

No arguments only show the inventory. Use npm run generate-audiobooks for an
explicit paid generation. The retired Edge/Noemi writer cannot overwrite Jessa.
"""
import runpy
from pathlib import Path

if __name__ == '__main__':
    runpy.run_path(str(Path(__file__).with_name('generate-elevenlabs-audiobooks.py')), run_name='__main__')
