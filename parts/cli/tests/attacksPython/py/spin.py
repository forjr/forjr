import os


def run(input, forjr):
    with open(os.path.join(forjr.disk, "spin.pid"), "w") as f:
        f.write(str(os.getpid()))
    # Code that never ends and holds the interpreter the whole time.
    n = 0
    while True:
        n += 1
