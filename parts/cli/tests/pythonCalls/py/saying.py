import time


def run(input, forjr):
    # What the work says reaches whoever follows its run: each value takes the place of the one before.
    for at in range(1, 4):
        forjr.say({"at": at})
        time.sleep(0.2)
    return 3
