def run(input, forjr):
    with open(forjr.file(input["id"]), "rb") as f:
        return f.read().decode()
