import psycopg2
import sys

print(f"Python version: {sys.version}")
print(f"psycopg2 version: {psycopg2.__version__}\n")

configs_to_test = [
    {"host": "127.0.0.1", "port": 5432},
    {"host": "localhost", "port": 5432},
    {"host": "172.19.0.2", "port": 5432},  # Docker internal IP from your inspect
]

for config in configs_to_test:
    print(f"Testing: {config['host']}:{config['port']}")
    try:
        conn = psycopg2.connect(
            host=config['host'],
            port=config['port'],
            database="postgres",
            user="postgres",
            password="password",
            connect_timeout=3
        )
        print(f"✅ SUCCESS with {config['host']}\n")
        
        # Test query
        cursor = conn.cursor()
        cursor.execute("SELECT version();")
        version = cursor.fetchone()[0]
        print(f"Database: {version[:50]}...\n")
        
        cursor.close()
        conn.close()
        
        print(f"🎉 Use this configuration in your code!")
        print(f"host=\"{config['host']}\"")
        break
        
    except Exception as e:
        print(f"❌ Failed: {str(e)[:100]}\n")

print("\nChecking pg_hba.conf settings in container...")
import subprocess
result = subprocess.run(
    ["docker", "exec", "backend-timescaledb-1", "cat", "/var/lib/postgresql/data/pg_hba.conf"],
    capture_output=True,
    text=True
)
print(result.stdout)
