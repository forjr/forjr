def run(input, forjr):
    if input["what"] == "unknown":
        return forjr.call("rowsAll", {"customer": input["customer"]})
    if input["what"] == "refused":
        return forjr.call("staffOnly", {})
    name = forjr.call("customerName", {"id": input["customer"]})
    note = forjr.call("addNote", {"body": "from Python"})
    try:
        forjr.call("staffOnly", {})
        refused = None
    except forjr.Error as error:
        refused = {"code": error.code, "message": error.message}
    return {"name": name["name"], "note": note["body"], "refused": refused}
