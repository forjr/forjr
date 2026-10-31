def run(input, forjr):
    return forjr.call("weather.today", {"city": input["city"]})
