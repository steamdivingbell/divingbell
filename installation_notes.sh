# Setup notes

# Installed Haxe 3.4.7 (per readme recommendation)
open https://haxe.org/download/version/3.4.7/
# Installed OpenFL via haxelib
haxelib install openfl # version 9.3.3 as of writing

# Attempted to build lime (dependency not found)
# Google says https://lime.openfl.org/docs/home/ so
haxelib install lime # 8.1.2
haxelib run lime setup # hxcpp 4.3.2

# Yet another missing dep in actuate
haxelib install actuate

# now the lime build is working in a local server. Yippee.
lime test html5

# Okay, now to figure out how to import app data
# There's a zipfile linked from the readme, at a whopping 2 GB. Downloaded that, and extracting
# Readme notes say that if I can rip out OpenFL then this zipfile is obsolete.
# It's much more likely that I'll just rewrite the damn thing in pure JS before I suffer through that.
# Anyways, copying over the images now

# okay, looks like it's working. Now I just have to make it website-worthy. sigh.
# I think the best starting point is to just make the HTML mockup first, then figure out the javascript nonsense.
# I'm 100% sure it's 100x more code than necessary.


# More notes on the datamining process here:
# https://www.fortressofdoors.com/steam-diving-bell/