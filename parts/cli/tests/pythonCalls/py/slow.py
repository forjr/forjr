import os
import time


def run(input, forjr):
    time.sleep(input["seconds"])
    return os.getpid()
