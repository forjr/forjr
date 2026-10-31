def run(input, forjr):
    # A call of a function that sends: under a tool call that nobody agreed to, it waits for a yes.
    return forjr.call("sendOut", {})
