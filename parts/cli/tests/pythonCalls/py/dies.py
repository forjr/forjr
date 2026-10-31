import os


def run(input, forjr):
    # A native package that crashes ends its program as this does.
    os._exit(3)
