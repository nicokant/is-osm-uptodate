import signal

import shlex
import subprocess

app_command = shlex.split('python3 is-osm-uptodate.py')

def setup_module():
    global app
    app = subprocess.Popen(app_command, cwd='..')
    import time
    time.sleep(3)

def teardown_module():
    global app
    app.send_signal(signal.SIGINT)
