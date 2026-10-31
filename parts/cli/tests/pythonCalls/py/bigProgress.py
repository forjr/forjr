def run(input, forjr):
    # Five thousand bytes: past the limit of one KB that the flow states, and far within the 1 MB of the default.
    forjr.save_progress("x" * 5000)
    return {"kept": True}
