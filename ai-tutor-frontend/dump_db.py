import sqlite3
import json
import os

db_path = r'd:\DoAn\ai-tutor-backend\ai_tutor.db'

def dump_db():
    if not os.path.exists(db_path):
        return {"error": "DB not found"}

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    data = {}
    
    cursor.execute("SELECT * FROM documents")
    data["documents"] = [dict(row) for row in cursor.fetchall()]

    cursor.execute("SELECT * FROM chat_sessions")
    data["sessions"] = [dict(row) for row in cursor.fetchall()]

    conn.close()
    return data

if __name__ == "__main__":
    print(json.dumps(dump_db(), indent=2, ensure_ascii=False))
