import os
import time


def run(input, forjr):
    kept = forjr.progress()
    if kept is not None:
        return {"handed": kept}
    forjr.save_progress({"n": 5})
    if input.get("wait"):
        # The test waits for this file, and kills the engine while the call is under way.
        with open(os.path.join(forjr.disk, "saved"), "w") as f:
            f.write("saved")
        time.sleep(60)
    return {"handed": None}
