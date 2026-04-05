import sqlite3
import os

db_path = r'd:\DoAn\ai-tutor-backend\ai_tutor.db'

def check_consistency():
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("--- RAW Documents ---")
    cursor.execute("SELECT id, file_name FROM documents")
    for row in cursor.fetchall():
        print(f"Doc ID: {row[0]}, File: {row[1]}")

    print("\n--- RAW Chat Sessions ---")
    cursor.execute("SELECT id, document_id, user_id, title FROM chat_sessions")
    for row in cursor.fetchall():
        print(f"Session ID: {row[0]}, DocID Ref: {row[1]}, User: {row[2]}, Title: {row[3]}")

    conn.close()

if __name__ == "__main__":
    check_consistency()
