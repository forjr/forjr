import sys


def run(input, forjr):
    line = sys.stdin.readline()
    return "the input is closed" if line == "" else f"read {line}"
