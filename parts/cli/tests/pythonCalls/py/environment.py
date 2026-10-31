import os
import sys


def run(input, forjr):
    return {
        "names": sorted(os.environ),
        "cards": os.environ.get("CUDA_VISIBLE_DEVICES"),
        "key": "FORJR_SECRET_KEY" in os.environ,
        "path": sys.path,
        "userSite": sys.flags.no_user_site,
        "disk": os.path.isdir(forjr.disk),
    }
