import os
import sys


def run(input, forjr):
    where = input["where"]
    # A file of the computer outside the folder of the call: the folder that outlasts a call is one.
    outside = os.path.join(forjr.disk, "outside.txt")
    with open(outside, "w") as f:
        f.write("a file of the computer")
    if where == "outside":
        return {"made": outside}
    if where == "dotdot":
        path = os.path.join(forjr.folder, "..", "dotdot.txt")
        with open(path, "w") as f:
            f.write("beside the folder")
        return {"made": path}
    if where == "linked":
        path = os.path.join(forjr.folder, "linked.txt")
        try:
            os.symlink(outside, path)
        except OSError:
            raise forjr.Fail("no-links", "This user may make no link to a file here.")
        return {"made": path}
    if where == "folderLink":
        path = os.path.join(forjr.folder, "through")
        if sys.platform == "win32":
            import _winapi

            _winapi.CreateJunction(forjr.disk, path)
        else:
            os.symlink(forjr.disk, path, target_is_directory=True)
        return {"made": os.path.join(path, "outside.txt")}
    path = os.path.join(forjr.folder, "made.txt")
    with open(path, "wb") as f:
        f.write(b"x" * (2 * 1024 * 1024) if where == "large" else b"made by Python")
    return {"made": path}
