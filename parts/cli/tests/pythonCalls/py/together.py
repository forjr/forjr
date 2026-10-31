import os
import time


def run(input, forjr):
    began = time.time()
    time.sleep(input["seconds"])
    return {"pid": os.getpid(), "began": began, "ended": time.time()}
