def run(entries, forjr):
    try:
        forjr.db()
        alone = "none"
    except forjr.Error as error:
        alone = error.code
    return [{"n": entry.input["n"], "of": len(entries), "alone": alone} for entry in entries]
