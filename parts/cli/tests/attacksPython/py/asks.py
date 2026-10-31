def run(input, forjr):
    # Each call is let out of run, so the error that reaches the caller is the one the engine raised for it.
    if input["what"] == "unknown":
        return forjr.call("rowsOf", {"customer": input["customer"]})
    return forjr.call("staffOnly", {})
