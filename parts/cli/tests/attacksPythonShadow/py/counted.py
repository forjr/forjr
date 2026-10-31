def run(input, forjr):
    return {"rows": forjr.db().execute("select count(*) from notes").fetchone()[0]}
