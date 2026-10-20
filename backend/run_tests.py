"""
Smart MSRTC - VisionX
Test Suite Runner
Executes all unit tests with Python standard library unittest.
"""

import unittest
import sys
import os

# Ensure project root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

def run_all_tests():
    loader = unittest.TestLoader()
    start_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'tests')
    suite = loader.discover(start_dir, pattern='test_*.py')

    runner = unittest.TextTestRunner(verbosity=2)
    result = runner.run(suite)

    if result.wasSuccessful():
        print("\nAll Smart MSRTC backend tests passed successfully!")
        return 0
    else:
        print(f"\nTests failed: {len(result.failures)} failures, {len(result.errors)} errors.")
        return 1

if __name__ == '__main__':
    sys.exit(run_all_tests())
