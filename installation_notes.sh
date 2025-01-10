# Setup notes

# Installed Haxe 3.4.7 (per readme recommendation)
open https://haxe.org/download/version/3.4.7/
# Installed OpenFL via haxelib
haxelib install openfl # version 9.3.3 as of writing

# Then we need lime (which runs our webserver)
haxelib install lime
# And all of its deps
haxelib install hxcpp
haxelib install lime-samples
haxelib install actuate
haxelib run lime setup

# now the lime build is working in a local server. Yippee.
lime test html5

# There's a zipfile linked from the readme, at a whopping 2 GB. Download and extract that
# https://drive.google.com/open?id=1YoBZf-wUHk44RKAg6NzkmhV8JLXG_ji7
unzip app_details_and_images.zip
mv -f app_details/* bin/html5/bin/data/v2/app_details/
mv -f img/* bin/html5/bin/data/v2/img/

# More notes on the datamining process here:
# https://www.fortressofdoors.com/steam-diving-bell/