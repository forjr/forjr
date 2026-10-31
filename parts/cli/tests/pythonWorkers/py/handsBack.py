def run(input, forjr):
    kept = forjr.progress()
    if kept is None:
        forjr.save_progress([1, 2])
        raise forjr.Back()
    return kept + [3]
