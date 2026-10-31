import os


def run(input, forjr):
    return f"outer in {os.getpid()}, {forjr.call('inner', {})}"
