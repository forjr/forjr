import os


def run(input, forjr):
    path = input["f"]
    with open(path) as f:
        text = f.read()
    return {
        "name": os.path.basename(path),
        "dir": os.path.normcase(os.path.realpath(os.path.dirname(path))),
        "folder": os.path.normcase(os.path.realpath(forjr.folder)),
        "text": text,
        "above": os.path.exists(os.path.join(forjr.folder, "..", "..", "x")),
    }
