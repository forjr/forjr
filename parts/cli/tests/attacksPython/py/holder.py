import os
import time


def run(input, forjr):
    db = forjr.db()
    made = os.path.join(forjr.folder, "held.txt")
    with open(made, "w") as f:
        f.write("held")
    with open(os.path.join(forjr.disk, "holder.started"), "w") as f:
        f.write("started")
    # The test adds a version of the app while the call is under way.
    time.sleep(4)
    with open(made) as f:
        text = f.read()
    return {"text": text, "notes": db.execute("select count(*) from notes").fetchone()[0]}
