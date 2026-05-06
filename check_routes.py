import sys
sys.path.insert(0, "/app")
from main import app
for r in app.routes:
    print(r.path)
