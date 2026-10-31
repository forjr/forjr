import os


def run(input, forjr):
    return {"names": sorted(os.environ), "values": sorted(os.environ.values())}
