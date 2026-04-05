import sqlite3
import os

db_path = r'd:\DoAn\ai-tutor-backend\ai_tutor.db'

def check_consistency():
    if not os.path.exists(db_path):
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    with open('consistency_final.txt', 'w', encoding='utf-8') as f:
        f.write("--- RAW Documents ---\n")
        cursor.execute("SELECT id, file_name, owner_id FROM documents")
        for row in cursor.fetchall():
            f.write(f"Doc ID: {row[0]}, File: {row[1]}, Owner: {row[2]}\n")

        f.write("\n--- RAW Chat Sessions ---\n")
        cursor.execute("SELECT id, document_id, user_id, title FROM chat_sessions")
        for row in cursor.fetchall():
            f.write(f"Session ID: {row[0]}, DocID Ref: {row[1]}, User: {row[2]}, Title: {row[3]}\n")

    conn.close()

if __name__ == "__main__":
    check_consistency()
